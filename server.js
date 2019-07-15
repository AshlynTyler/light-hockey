const express = require("express");
const path = require("path");
const PORT = process.env.PORT || 3001;
const app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http, { origins: '*:*'});




// Serve up static assets (usually on heroku)
if (process.env.NODE_ENV === "production") {
  app.use(express.static("client/build"));
}

// Send every request to the React app
// Define any API routes before this runs
app.get("*", function(req, res) {
  res.sendFile(path.join(__dirname, "./client/public/index.html"));
});

// Server side logic.

//returns the distance between two points.
function distance(x1,y1,x2,y2){
  return Math.sqrt(((x1-x2)**2)+((y1-y2)**2))
}

//returns the angle of direction in radians from the first point to the second point
// relative to the positive x axis (going counterclockwise).

function direction(x1,y1,x2,y2){

  return Math.atan2(y1-y2,x2-x1)
}

//returns the x and y length of a right triangle with hypotenuse of "length"
// and an angle of "angle".

function findXY(length,angle){
  return{
      y: Math.sin(angle) * length * -1,
      x: Math.cos(angle) * length
  }
}

let boundary = {
  top: 10,
  left: 10,
  bottom: 665,
  right: 1190
}

let players = [];

const colors = ["#ff0000","#0000ff","#00ff00"]

let pucks = [];

let unclaimedDisks = [];

let score = {
  blue: 0,
  red: 0
}

function UnclaimedDisk(x,y){
  this.x = x

  this.y = y

  this.radius = 25
}

let diskLocations = [{x: 50, y: 50},{x: 300, y: 50},{x: 50, y: 300},{x: 300, y: 300}]

function Puck(x = 600,y = 675/2,radius=15,points=10){
  this.x = x
  this.y = y

  this.xSpeed = 0;
  this.ySpeed = 0;

  this.friction = .02;

  this.maxSpeed = 30;

  this.direction = 0;

  this.points = points

  this.radius = radius

  this.id = pucks.length
}

function movePuck(puck){
  puck.x += puck.xSpeed

  puck.y += puck.ySpeed

  if(puck.x -puck.radius< boundary.left){

    scoreGoal(puck,"red")

    puck.x += (boundary.left - (puck.x - puck.radius))*2

    puck.xSpeed = -puck.xSpeed
  }
  if(puck.x +puck.radius> boundary.right){

    scoreGoal(puck,"blue")

    puck.x += (boundary.right - (puck.x + puck.radius))*2

    puck.xSpeed = -puck.xSpeed
  }
  if(puck.y -puck.radius< boundary.top){
    puck.y += (boundary.top - (puck.y - puck.radius))*2

    puck.ySpeed = -puck.ySpeed
  }
  if(puck.y +puck.radius> boundary.bottom){
    puck.y += (boundary.bottom - (puck.y + puck.radius))*2

    puck.ySpeed = -puck.ySpeed
  }

  puck.speed = distance(0,0,puck.xSpeed,puck.ySpeed)

  puck.direction = direction(0,0,puck.xSpeed,puck.ySpeed)

  puck.speed -= puck.friction

  if(puck.speed < 0){
      puck.speed = 0
  }

  if(puck.speed > puck.maxSpeed)
      puck.speed = puck.maxSpeed

  let newSpeeds = findXY(puck.speed,puck.direction)

  puck.xSpeed = newSpeeds.x
  puck.ySpeed = newSpeeds.y


    return puck
  
}

function scoreGoal(puck,teamScore){
  if(puck.y > boundary.top + (boundary.bottom-boundary.top)/3 && puck.y < boundary.top + (boundary.bottom-boundary.top)*2/3){

    io.in("test-room").emit("goal", {id: puck.id, team: "red", points: puck.points})

    pucks.splice(puck.id,1)
  }

}

function gameStep(){
  pucks.forEach(function(puck){
    movePuck(puck)
  })
}

let gameInterval = setInterval(() =>{
  this.gameStep()
},(1000/60))

// handling socket connections and emissions.
io.on('connection', function(socket){
  console.log('a user connected');
  socket.on('disconnect', function(){
    console.log('user disconnected');
  });

  socket.join("test-room")

  socket.on("player join", function(player){
    player.id = players.length

    player.color = colors[player.id]

    players.push(player)

      unclaimedDisks.push(new UnclaimedDisk(diskLocations[players.length -1 ].x,diskLocations[players.length -1].y))

    socket.emit("player join response", {id: player.id, players: players, disks: unclaimedDisks})

    socket.broadcast.emit("other join response", {players: players, disks: unclaimedDisks})


  })

  socket.on("player info", function(player){
    players[player.id] = player

    socket.broadcast.emit("player info response", players[player.id])
  })

  socket.on("claim disk", function(data){
    unclaimedDisks = data

    if(unclaimedDisks.length === 0 && pucks.length === 0){

      console.log("success!")
      pucks.push(new Puck())
    }

    io.in("test-room").emit("claim disk response", {disks: unclaimedDisks, pucks: pucks})
  })

  socket.on("puck info", function(puck){
    pucks[puck.id] = puck

    socket.broadcast.emit("puck info response", puck)
  })
});



http.listen(PORT, function() {
  console.log(`🌎 ==> API server now on port ${PORT}!`);
});
