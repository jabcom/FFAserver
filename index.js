var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);

var gameState = {
  server: {
    version: "0.0.1",
    salt: "Salt",
    name: "localhost"
  },
  rooms: [{
    id: "EKIW",
    host: "dave",
    state: 0,
    word: "",
    catagory: "",
    artist: "",
    players: [{
      name: "dave",
      state: 0,
      words: ["word", "another"],
      score: 0,
      socketID: ""
    }]
  }]
}

//WebServer
http.listen(3000, () => {
  console.log('listening on *:3000');
});
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

function joinRoom(roomID, hash, playerName, socketID) {
  //Update room player list
  return true
}

function playerKick(roomId, playerID) {

}

function newConnection(socket) {
  console.log("New Connection " + socket.id);
}

function sendUpdateRoom(roomID) {
  let room = gameState.rooms.find(element => element.id === roomID);
  for (let player of room.players) {
    io.to(player.socketID).emit('roomInfo', getRoomInfo(session.roomID, session.playerName));
}

function getRoomInfo(roomID, playerName) {
  let room = gameState.rooms.find(element => element.id === roomID);
  returnData = {
    host: room.host,
    state: room.state,
    catagory: room.catagory,
    players: []
  }
  if (playerName != room.artist) {
    returnData.word = room.word;
    returnData.artist = false;
  } else {
    returnData.artist = true;
  }
  for (let player of room.players) {
    returnData.players.push({
      name: player.name,
      state: player.state,
      score: player.score
    });
  }
  return returnData;
}

//Socket.io Server
io.on('connection', socket => {
  //New Connection
  console.log("New Connection " + socket.id);
  let session = {
    roomID: null,
    playerName: null
  };

  //ServerInfo
  socket.on('serverInfo', socket => {
    socket.emit('serverInfo', gameState.server);
  });

  //RoomInfo
  socket.on('roomInfo', socket => {
    socket.emit('roomInfo', getRoomInfo(session.roomID, session.playerName));
  });

  //JoinRoom
  socket.on('joinRoom', (socket, data) => {
    let roomID = data.roomID;
    let playerName = data.playerName;
    let hash = data.hash;
    let socketID = socket.id;
    if (joinRoom(roomID, playerName, hash, socketID)) {
      session.roomID = returnJoinRoom.roomID;
      session.playerName = returnJoinRoom.playerName
      socket.emit('joinRoom', {result: true});
      socket.join('Room'+roomID)
    } else {
      socket.emit('joinRoom', {result: false, data: returnJoinRoom);
    }
  });

  //Disconnected
  socket.on('disconnect', socket => {
    console.log("Disconnected "+ socket);
    if (info.room != null) {
      playerKick(info.room, info.player);
    }
  });
});
