var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var md5 = require('md5');
var crypto = require("crypto");
var roomCharList = ["A", "B", "C", "D", "E", "F", "G", "H", "J", "K", "M", "N", "P", "R", "S", "T", "W", "X", "Y", "Z"];
var playerStates = {
  lobby: 0, addingWords: 1, addedWords: 2
};
var roomStates = {
  lobby:0, addingWords: 1, playingGame: 2, artistGuessed: 3, wordGuessed: 4
};
var gameState = {
  server: {
    version: "0.0.1",
    salt: "Salt",
    name: "localhost"
  },
  categorys: ["Cat1", "Cat2", "Cat3"],
  settings: {
    minWords: 3
  },
  rooms: [{
    id: "EKIW",
    host: "dave",
    state: 0,
    word: "",
    category: "",
    artist: "",
    passcode: "123",
    lastWinner: "",
    players: [{
      name: "dave",
      state: 0,
      words: ["word", "another"],
      score: 0,
      socketID: ""
    }]
  }]
};

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
  io.emit('saltUpdate', {salt: gameState.server.salt});
  log("Salt updated: " + gameState.server.salt);
}

function genRoomName() {
  let returnName = "";
  for (let i = 0; i < 4; i++) {
    name += roomCharList[Math.floor(Math.Random() * roomCharList.length)]
  }
  return returnName
}

function createRoom(playerName, passcode, socketID) {
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
    players: [{
      name: playerName,
      state: 0,
      wordList: [],
      score: 0,
      socketID: socketID
    }],
    host: playerName
  }
  return roomName;
}

function updateReadyWordStatus(roomID, playerName) {
  //Set player
  player = gameState.rooms[getRoomIndex(roomID)].players[getPlayerIndex(playerName)];
  if (player.wordList.length < gameState.settings.minWords){
    gameState.rooms[getRoomIndex(roomID)].players[getPlayerIndex(playerName)].state = playerStates.addedWords;
  } else {
    gameState.rooms[getRoomIndex(roomID)].players[getPlayerIndex(playerName)].state = playerStates.addingWords;
  }
  //Set Server
  if (!gameState.rooms[getRoomIndex(roomID)].players.some(player => player.status === playerStates.addingWords)) {
    gameState.rooms[getRoomIndex(roomID)].state = roomStates.playingGame;
  }
}

function getRoomIndex(roomID) {
  return gameState.rooms.findIndex(element => element.id === roomID);
}
function getPlayerIndex(roomID, playerName) {
  return gameState.rooms[getRoomIndex(roomID)].players.findIndex(element => element.id === roomID);
}

function sendPlayerError(roomID, playerName, message) {
  io.to(gameState.rooms[getRoomIndex(roomID)].players[playerName].socketID).emit('showError', {message: message});
}

function playerKick(roomID, playerName) {
  //Remove player from room
  gameState.rooms[getRoomIndex(roomID)].players.splice(getPlayerIndex(roomID, playerName),1);
  //If room is empty delete room
  if (gameState.rooms[getRoomIndex(roomID)].players.length == 0) {
    gameState.rooms.splice(getRoomIndex(roomID), 1);
  } else {
    sendUpdateRoom(roomID);
  }
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
    players: [],
    lastWinner: room.lastWinner
  }
  if (playerName != room.artist) {
    returnData.word = room.word;
    returnData.artist = false;
  } else {
    returnData.artist = true;
  }
  if (room.host == playerName) {
    returnData.categorys = gameState.categorys;
  }
  for (let player of room.players) {
    playerData = {
      name: player.name,
      state: player.state,
      score: player.score,
      wordCount: player.wordList.length
    };
    if (player.name == playerName) {
      playerData.wordList = player.wordList;
    }
    returnData.players.push(playerData);
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
    if (session.roomID != null){
      socket.emit('roomInfo', getRoomInfo(session.roomID, session.playerName));
    } else {
      socket.emit('showError', {message: "Can't get room info. User is in a room"});
    }
  });

  //JoinRoom
  socket.on('joinRoom', (socket, data) => {
    let roomID = data.roomID;
    let playerName = data.playerName;
    let hash = data.hash;
    if (gameState.rooms.some(room => room.ID === roomID)) {
      let room = gameState.rooms.find(element => element.id === roomID);
      if (room.state != roomStates.lobby) {
        if (room.players.some(player => player.name === playerName)) {
          gameState.rooms[getRoomIndex(roomID)].players[getPlayerIndex(playerName)].push({
            name: playerName,
            state: 0,
            wordList: [],
            score: 0,
            socketID: socket.ID
          });
          session.roomID = roomID;
          session.playerName = playerName;
          sendUpdateRoom(roomID);
        } else {
          socket.emit('showError', {message: "Name already taken"});
        }
      } else {
        socket.emit('showError', {message: "Room is not in lobby"});
      }
    } else {
      socket.emit('showError', {message: "Room does not exist"});
    }
  });

  //NewRoom
  socket.on('createRoom', (socket, data) => {
    let playerName = data.playerName;
    let passcode = data.passcode;
    let roomID = createRoom(playerName, passcode, session.socketID);
    socket.join('Room'+roomID)
    sendUpdateRoom(roomID)
  });

  //setCategory
  socket.on('setCategory', (socket, data) => {
    let roomIndex = getRoomIndex(session.roomID);
    if (gameState.rooms[roomIndex].host == session.playerName) {
      if (gameState.rooms[roomIndex].state != roomStates.lobby) {
        gameState.rooms[getRoomIndex(session.roomID)].category = data.category;
        sendUpdateRoom(session.roomID);
      } else {
        socket.emit('showError', {message: "Room is not in state lobby"});
      }
    } else {
      socket.emit('showError', {message: "User is not host. Not allowed to change category"});
    }
  });

  //Set WordList
  socket.on('setWordList', (socket, data) => {
    if (session.roomID != null){
      if (gameState.rooms[roomIndex].state != roomStates.addingWords) {
        gameState.rooms[getRoomIndex(session.roomID)].players[getPlayerIndex(session.playerName)].wordList = data.list.slice(0, gameState.settings.minWords);
        updateReadyWordStatus(roomID, playerName);
        sendUpdateRoom(session.roomID);
      } else {
        socket.emit('showError', {message: "Room is not in state Adding Words"});
      }
    } else {
      socket.emit('showError', {message: "Can't set word list. User is in a room"});
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
