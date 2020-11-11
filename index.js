var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);

var gameState = {
  server: {
    version: "0.0.1",
    salt: "Salt",
    name: "Fake Fake Artist"
  },
  rooms: {
    id: "EKIW",
    host: "dave",
    state: 0,
    word: "",
    catagory: "",
    artist: "",
    players: {
      name: "dave",
      uuid: "abc...",
      state: 0,
      words: ["word", "another"],
      score: 0,
      socketID: ""
    }
  }
}

//WebServer
http.listen(3000, () => {
  console.log('listening on *:3000');
});
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

function joinRoom(roomID, hash, name) {

}

function newConnection(socket) {
  console.log("New Connection " + socket.id);
}

//"Socket"Server
io.on('connection', socket => {
  console.log("New Connection " + socket);
  socket.on('disconnect', socket => {
    console.log("Disconnected "+ socket);
  });
});
