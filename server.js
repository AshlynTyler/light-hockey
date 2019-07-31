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

let idIncrement = 0

let preRooms = []

function PreRoom(max){
  this.players = []

  this.maxPlayers = max

  this.id = "room-" + idIncrement

  this.joined = false

  idIncrement++
}

let rooms = []

function Room(id){
  this.players = []

  this.pucks = [];

  this.unclaimedDisks = []

  this.goalCount = 0;

  this.id = id

  this.score = {
    blue: 0,
    red: 0
  }

  this.leftPlayers = 0
}

let score = {
  blue: 0,
  red: 0
}

function UnclaimedDisk(x,y,team,id){
  this.x = x

  this.y = y

  this.radius = 25

  this.team = team

  this.id = id
}

let diskLocations = [{x: 300, y: 225, team: "blue"},{x: 900, y: 225, team: "red"},{x: 300, y: 450, team: "blue"},{x: 900, y: 450, team: "red"}]

function Puck(id,x = 600,y = 675/2,radius=15,points=1){
  this.x = x
  this.y = y

  this.xSpeed = 0;
  this.ySpeed = 0;

  this.friction = .02;

  this.maxSpeed = 30;

  this.direction = 0;

  this.points = points

  this.radius = radius

  this.id = id

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

  socket.join("lobby")

  socket.room = ""

  socket.on("enter lobby", function(){
    socket.emit("enter lobby response", preRooms)
  })

  socket.on("create preroom",function(data){
    let room = new PreRoom(data.max)

    data.player.ready = false

    data.player.id = 0

    room.players.push(data.player)

    preRooms.push(room)

    socket.join(room.id)

    socket.emit("create preroom response",preRooms)

    socket.to("lobby").emit("other preroom response",preRooms)
  })

  socket.on("join room", function(data){
    preRooms = data.rooms

    socket.join(data.id)

    socket.to("lobby").emit("rooms change response", data.rooms)
  })
  socket.on("leave room", function(data){
    preRooms = data.rooms

    socket.leave(data.id)

    socket.to("lobby").emit("rooms change response", data.rooms)
  })

  socket.on("ready", function(rooms){
    preRooms = rooms
    socket.to("lobby").emit("rooms change response", rooms)
  })

  socket.on("start game",function(data){
    room = new Room(data.roomId)

    rooms.push(room)

    socket.leave("lobby")

    io.in(data.roomId).emit("start game response", data)

  })

  socket.on("start game response b", function(data){
    socket.emit("start game response c", data)
  })

  socket.on("start game events", function(roomId){

    console.log("events!")

    let room;

    let listeners = [];
  
    rooms.forEach(function(thisRoom){
      if(roomId === thisRoom.id)
        room = thisRoom
    })

    listeners.push("player join")
    //in-game emissions/responses
    socket.on("player join", function(player){
      player.id = room.players.length

      room.players.push(player)

      room.unclaimedDisks.push(new UnclaimedDisk(diskLocations[room.players.length -1 ].x,diskLocations[room.players.length -1].y,diskLocations[room.players.length -1].team,room.players.length-1))

      socket.emit("player join response", {id: player.id, players: room.players, disks: room.unclaimedDisks, score: room.score})

      socket.in(roomId).emit("other join response", {players: room.players, disks: room.unclaimedDisks})

    })

    listeners.push("player info")
    socket.on("player info", function(player){
      room.players[player.id] = player

      socket.in(roomId).emit("player info response", room.players[player.id])
    })

    listeners.push("claim disk")
    socket.on("claim disk", function(data){
      room.unclaimedDisks = data.disks

      let newpuck = false

      if(room.unclaimedDisks.length === 0 && room.pucks.length === 0){
        room.pucks.push(new Puck(room.pucks.length))

        newpuck = true
      }

      io.in(roomId).emit("claim disk response", {disks: room.unclaimedDisks, pucks: room.pucks, newpuck: newpuck, player:data.player})
    })

    listeners.push("puck info")
    socket.on("puck info", function(puck){
      room.pucks[puck.id] = puck

      socket.in(roomId).emit("puck info response", puck)

      room.goalCount = 0;
    })

    listeners.push("goal")
    socket.on("goal", function(data){
      room.goalCount += 1

      if(room.goalCount === room.players.length - room.leftPlayers){
        room.goalCount = 0

        if(data.team === "red"){
          room.score.red += data.puck.points
        }
        else{
          room.score.blue += data.puck.points
        }

        room.pucks.splice(data.id,1)

        room.pucks.forEach(function(index){
            index.id = room.pucks.indexOf(index)
        })

        io.in(roomId).emit("goal response",{score: room.score, id: data.puck.id, puck: new Puck(room.pucks.length)})


      }
    })

    listeners.push("end game")
    socket.on("end game", function(player){
      socket.leave(roomId)

      socket.join("lobby")

      listeners.forEach(function(listener){
        socket.removeAllListeners(listener)
      })

      socket.emit("end game response")

      room.leftPlayers++

      if(room.leftPlayers === room.players.length){
        rooms.splice(rooms.indexOf(room),1)
      }
    })

    socket.on("disconnect", function(){
      room.leftPlayers++

      if(room.leftPlayers === room.players.length){
        rooms.splice(rooms.indexOf(room),1)
      }
    })



  })
});



http.listen(PORT, function() {
  console.log(`🌎 ==> API server now on port ${PORT}!`);
});
