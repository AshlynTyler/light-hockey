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


players = [];

colors = ["#ff0000","#0000ff","#00ff00"]

pucks = [];

function Puck(x = 600,y = 675/2,radius=10,points=20){
  this.x = x
  this.y = y

  this.xSpeed = 0;
  this.ySpeed = 0;

  this.friction = .01;

  this.maxSpeed = 30;

  this.direction = 0;

  this.points = points

  this.radius = radius
}

function gameStep(){

}

// handling socket connections and emissions.
io.on('connection', function(socket){
  console.log('a user connected');
  socket.on('disconnect', function(){
    console.log('user disconnected');
  });

  socket.on("player join", function(player){
    player.id = players.length

    player.color = colors[player.id]

    if(player.id === 0){
      pucks.push(new Puck())

      socket.emit
    }
      

    players.push(player)

    socket.emit("player join response", {id: player.id, players: players})

    socket.broadcast.emit("other join response", players)
  })

  socket.on("player info", function(player){
    players[player.id] = player

    socket.broadcast.emit("player info response", players[player.id])
  })

  socket.on("claim disk", function(data){
    socket.broadcast.emit("claim disk response", data)
  })
});



http.listen(PORT, function() {
  console.log(`🌎 ==> API server now on port ${PORT}!`);
});
