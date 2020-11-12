var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var md5 = require('md5');
var crypto = require("crypto");
var roomCharList = ["A", "B", "C", "D", "E", "F", "G", "H", "J", "K", "M", "N" "P", "R", "S", "T", "W", "X", "Y", "Z";]
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
    category: "",
    artist: "",
    passcode: "123",
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

function log(message) {
  console.log(new Date().toISOString() + " - " + message);
}

function updateSalt() {
  gameState.server.salt = crypto.randomBytes(16).toString('hex');
  io.emit('saltUpdate', gameState.server.salt);
  log("Salt updated: " + gameState.server.salt);
}

function joinRoom(roomID, hash, playerName, socketID) {
  let returnData = {result: false, message: "joinRoom function Initial state not changed"};
  let room = gameState.rooms.find(element => element.id === roomID);
  if (md5(roomID+gameState.server.salt+playerName+room.passcode) == hash){
    //check name
  } else {
    returnData = {result: false, message: "Wrong passcode"};
  }
  return returnData;
}

function genRoomName() {
  let returnName = "";
  for (let i = 0; i < 4; i++) {
    name += roomCharList[Math.floor(Math.Random() * roomCharList.length)]
  }
  return returnName
}

function newRoom(playerName, passcode, socketID) {
  //Create unused room name
  let roomName = ""
  let roomNameInvalid = true;
  do {
    roomName = genRoomName();
    if (gameState.rooms.some(room => room.ID === roomName)) {
      roomNameInvalid = false;
    }
  } while(roomNameInvalid)
  roomData = {
    id: roomName,
    state: 0,
    word: "",
    category: "",
    artist: "",
    passcode: passcode,
    players: [{
      name: playerName,
      state: 0,
      words: [],
      score: 0,
      socketID: socketID
    }],
    host: playerName
  }
  return roomName;
}

function getRoomIndex(roomID) {
  return gameState.rooms.findIndex(element => element.id === roomID);
}
function getPlayerIndex(roomID, playerName) {
  return gameState.rooms[getRoomIndex(roomID)].players.findIndex(element => element.id === roomID);
}

function playerKick(roomID, playerName) {
  gameState.rooms[getRoomIndex(roomID)].players.splice(getPlayerIndex(roomID, playerName),1);
  sendUpdateRoom(roomID);
}

function newConnection(socket) {
  log("New Connection " + socket.id);
}

function sendMessageRoom(roomID, subject, message) {
  io.in('Room'+roomID).emit(subject, message);
}

function sendUpdateRoom(roomID) {
  let room = gameState.rooms.find(element => element.id === roomID);
  for (let player of room.players) {
    io.to(player.socketID).emit('roomInfo', getRoomInfo(session.roomID, session.playerName));
  }
}

function getRoomInfo(roomID, playerName) {
  let room = gameState.rooms.find(element => element.id === roomID);
  returnData = {
    host: room.host,
    state: room.state,
    category: room.category,
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
  log("New Connection " + socket.id);
  let session = {
    roomID: null,
    playerName: null,
    socketID: socket.id
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
    if (joinRoom(roomID, playerName, hash, session.socketID)) {
      session.roomID = returnJoinRoom.roomID;
      session.playerName = returnJoinRoom.playerName
      socket.emit('joinRoom', {result: true});
      socket.join('Room'+roomID)
    } else {
      socket.emit('joinRoom', {result: false, data: returnJoinRoom});
    }
  });

  //NewRoom
  socket.on('newRoom', (socket, data) => {
    let playerName = data.playerName;
    let passcode = data.passcode;
    let roomID = newRoom(playerName, passcode, session.socketID);
    socket.join('Room'+roomID)
    sendUpdateRoom(roomID)
  });

  //setCategory
  socket.on('setCategory', (socket, data) => {
    let roomIndex = getRoomIndex(roomID);
    if (gameState.rooms[roomIndex].host == session.playerName) {
      gameState.rooms[getRoomIndex(session.roomID)].category = data.category;
      sendUpdateRoom(roomID)
    } else {
      socket.emit('showError', "User is not host. Not allowed to change category");
    }
  });

  //Disconnected
  socket.on('disconnect', socket => {
    if (session.room != null) {
      log("Disconnected " + info.player + " from " + info.room + " " + session.socketID);
      playerDelete(session.roomID, session.playerName);
      session.roomID == null;
      session.playerName == null;
    } else {
      log("Disconnected blank connection " + session.socketID);
    }
  });
});


setInterval(updateSalt, 30*1000);
