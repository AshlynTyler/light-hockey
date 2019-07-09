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

players = [];

colors = ["#ff0000","#0000ff","#00ff00"]

// handling socket connections and emissions.
io.on('connection', function(socket){
  console.log('a user connected');
  socket.on('disconnect', function(){
    console.log('user disconnected');
  });

  socket.on("player join", function(player){
    player.id = players.length

    player.color = colors[player.id]

    players.push(player)

    socket.emit("player join response", {id: player.id, players: players})

    socket.broadcast.emit("other join response", players)
  })

  socket.on("player info", function(player){
    players[player.id].mouse.x = player.mouse.x
    players[player.id].mouse.y = player.mouse.y

    socket.broadcast.emit("player info response", players[player.id])
  })

  socket.on("test", function(data){
    console.log(data)
  })
});



http.listen(PORT, function() {
  console.log(`🌎 ==> API server now on port ${PORT}!`);
});
