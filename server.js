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

const colors = ["#0000ff","#ff0000","#00ffaa","#ffaa00"]

let pucks = [];

let unclaimedDisks = [];

let goalCount = 0;

let score = {
  blue: 0,
  red: 0
}

function UnclaimedDisk(x,y,team){
  this.x = x

  this.y = y

  this.radius = 25

  this.team = team
}

let diskLocations = [{x: 300, y: 225, team: "blue"},{x: 900, y: 225, team: "red"},{x: 300, y: 450, team: "blue"},{x: 900, y: 450, team: "red"}]

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

  this.goal = 0
}



function scoreGoal(puck,team){
  if(puck.y > boundary.top + (boundary.bottom-boundary.top)/3 && puck.y < boundary.top + (boundary.bottom-boundary.top)*2/3){

    pucks.splice(puck.id,1)

    pucks.forEach(function(index){
      index.id = pucks.indexOf(index)
    })

    console.log("ping")

    io.in("test-room").emit("goal", {id: puck.id, team: team, points: puck.points, puck: new Puck()})
  }

}

function gameStep(){
  pucks.forEach(function(puck){
    movePuck(puck)
  })
}

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

      unclaimedDisks.push(new UnclaimedDisk(diskLocations[players.length -1 ].x,diskLocations[players.length -1].y,diskLocations[players.length -1].team))

    socket.emit("player join response", {id: player.id, players: players, disks: unclaimedDisks, score: score})

    socket.broadcast.emit("other join response", {players: players, disks: unclaimedDisks})


  })

  socket.on("player info", function(player){
    players[player.id] = player

    socket.broadcast.emit("player info response", players[player.id])
  })

  socket.on("claim disk", function(data){
    unclaimedDisks = data

    if(unclaimedDisks.length === 0 && pucks.length === 0){
      pucks.push(new Puck())
    }

    io.in("test-room").emit("claim disk response", {disks: unclaimedDisks, pucks: pucks})
  })

  socket.on("puck info", function(puck){
    pucks[puck.id] = puck

    socket.broadcast.emit("puck info response", puck)

    goalCount = 0;
  })

  socket.on("goal", function(data){
    goalCount += 1

    if(goalCount === players.length){
      goalCount = 0

      if(data.team === "red"){
        score.red += data.puck.points
      }
      else{
        score.blue += data.puck.points
      }

      pucks.splice(data.id,1)

      pucks.forEach(function(index){
          index.id = pucks.indexOf(index)
      })

      io.in("test-room").emit("goal response",{score: score, id: data.puck.id, puck: new Puck()})


    }
  })
});



http.listen(PORT, function() {
  console.log(`🌎 ==> API server now on port ${PORT}!`);
});
