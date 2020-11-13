var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var md5 = require('md5');
var crypto = require("crypto");
var roomCharList = ["B", "C", "D", "F", "G", "H", "J", "K", "M", "N", "P", "R", "S", "T", "W", "X", "Y", "Z"];
var playerStates = {
  lobby: 0, addingWords: 1, addedWords: 2
};
var roomStates = {
  lobby:0, addingWords: 1, playingGame: 2, artistGuessed: 3, wordGuessed: 4
};
var gameState = {
  server: {
    version: "0.0.1",
    name: "localhost"
  },
  categorys: ["Cat1", "Cat2", "Cat3"],
  settings: {
    minWords: 3,
    debugMode: true
  },
  rooms: []
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

function genRoomName() {
  let returnName = [];
  for (let i = 0; i < 4; i++) {
    returnName[i] = roomCharList[Math.floor(Math.random() * roomCharList.length)]
  }
  return returnName.join("");
}

function createRoom(playerName, socketID) {
  //Create unused room name
  let roomName = ""
  let roomNameInvalid = true;
  do {
    roomName = genRoomName();
    if (!gameState.rooms.some(room => room.id === roomName)) {
      roomNameInvalid = false;
    }
  } while(roomNameInvalid)
  roomData = {
    id: roomName,
    state: 0,
    word: "",
    category: "",
    artist: "",
    lastWinner: "",
    host: playerName,
    players: [{
      name: playerName,
      state: 0,
      wordList: [],
      score: 0,
      socketID: socketID,
      guessed: false
    }],
  }
  gameState.rooms.push(roomData);
  return roomName;
}

function updateReadyWordStatus(roomID, playerName) {
  //Set player
  let roomIndex = getRoomIndex(roomID);
  let playerIndex = getPlayerIndex(roomID, playerName)
  player = gameState.rooms[roomIndex].players[playerIndex];
  if (player.wordList.length < gameState.settings.minWords){
    gameState.rooms[roomIndex].players[playerIndex].state = playerStates.addedWords;
  } else {
    gameState.rooms[roomIndex].players[playerIndex].state = playerStates.addingWords;
  }
  //Set Server
  if (!gameState.rooms[roomIndex].players.some(player => player.status === playerStates.addingWords)) {
    gameState.rooms[roomIndex].state = roomStates.playingGame;
  }
}

function getRoomIndex(roomID) {
  return gameState.rooms.findIndex(element => element.id === roomID);
}
function getPlayerIndex(roomID, playerName) {
  return gameState.rooms[getRoomIndex(roomID)].players.findIndex(element => element.name === playerName);
}

function sendPlayerError(roomID, playerName, message) {
  io.to(gameState.rooms[getRoomIndex(roomID)].players[playerName].socketID).emit('showError', {message: message});
}

function playerRemove(roomID, playerName) {
  //Remove player from room
  log("Removing " + playerName + " from " + roomID);
  let roomIndex = getRoomIndex(roomID);
  let playerIndex = getPlayerIndex(roomID, playerName);
  gameState.rooms[roomIndex].players.splice(playerIndex, 1);
  //If room is empty delete room
  if (gameState.rooms[roomIndex].players.length == 0) {
    gameState.rooms.splice(roomIndex, 1);
  } else {
    if (gameState.rooms[roomIndex].host == playerName) {
      //If player was host, set new host
      gameState.rooms[roomIndex].host = gameState.rooms[roomIndex].players[0].name;
    }
  }
  sendUpdateRoom(roomID);
}

function newConnection(socket) {
  log("New Connection " + socket.id);
}

function sendMessageRoom(roomID, subject, message) {
  io.in('Room'+roomID).emit(subject, message);
}

function sendUpdateRoom(roomID) {
  log("Updating room " + roomID);
  let room = gameState.rooms.find(element => element.id === roomID);
  for (let player of room.players) {
    io.to(player.socketID).emit('roomInfo', getRoomInfo(roomID, player.name));
  }
}

function getRoomInfo(roomID, playerName) {
  let room = gameState.rooms.find(element => element.id === roomID);
  returnData = {
    id: room.id,
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
      wordCount: player.wordList.length,
      guessed: player.guessed
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
  socket.on('serverInfo', dataString => {
    try{
      let data = JSON.parse(dataString);
      log(socket.id);
      let serverInfo = gameState.server;
      serverInfo.minWords = gameState.settings.minWords;
      socket.emit('serverInfo', gameState.server);
    } catch(error) {
      log("ERROR : 001" + JSON.stringify(error, ["message", "arguments", "type", "name"]));
      try {
        socket.emit('showError', {message: "ERROR 001: " + error.message});
      } catch{}
    }
  });

  //Debug Gamestate
  socket.on('gameState', dataString => {
    try{
      let data = JSON.parse(dataString);
      if (gameState.settings.debugMode){
        socket.emit('serverInfo', gameState);
      }
    } catch(error) {
      log("ERROR 002: " + JSON.stringify(error, ["message", "arguments", "type", "name"]));
      try {
        socket.emit('showError', {message: "ERROR 002:" + error.message});
      } catch{}
    }
  });

  //RoomInfo
  socket.on('roomInfo', dataString => {
    try{
      let data = JSON.parse(dataString);
      if (session.roomID != null){
        socket.emit('roomInfo', getRoomInfo(session.roomID, session.playerName));
      } else {
        socket.emit('showError', {message: "Can't get room info. User is in a room"});
      }
    } catch(error) {
      log("ERROR 003: " + JSON.stringify(error, ["message", "arguments", "type", "name"]));
      try {
        socket.emit('showError', {message: "ERROR 003:" + error.message});
      } catch{}
    }
  });

  //JoinRoom
  //TODO, if player joins new room and was last in other, delete other
  socket.on('joinRoom', dataString => {
    try{
      let data = JSON.parse(dataString);
      let roomID = data.roomID;
      let playerName = data.playerName;
      if (gameState.rooms.some(room => room.id === roomID)) {
        let room = gameState.rooms.find(element => element.id === roomID);
        if (room.state == roomStates.lobby) {
          if (!room.players.some(player => player.name === playerName)) {
            gameState.rooms[getRoomIndex(roomID)].players.push({
              name: playerName,
              state: 0,
              wordList: [],
              score: 0,
              socketID: session.socketID,
              guessed: false
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
    } catch(error) {
      log("ERROR 004: " + JSON.stringify(error, ["message", "arguments", "type", "name"]));
      try {
        socket.emit('showError', {message: "ERROR 004: " + error.message});
      } catch{}
    }
  });

  //NewRoom
  socket.on('createRoom', dataString => {
    try{
      let data = JSON.parse(dataString);
      let playerName = data.playerName;
      let roomID = createRoom(playerName, session.socketID);
      session.roomID = roomID;
      session.playerName = playerName;
      socket.join('Room'+roomID)
      sendUpdateRoom(roomID);
      log(JSON.stringify(session));
    } catch(error) {
      log("ERROR 005: " + JSON.stringify(error, ["message", "arguments", "type", "name"]));
      try {
        socket.emit('showError', {message: "ERROR 005: " + error.message});
      } catch{}
    }
  });

  //setCategory
  socket.on('setCategory', dataString => {
    try{
      let data = JSON.parse(dataString);
      let roomIndex = getRoomIndex(session.roomID);
      if (gameState.rooms[roomIndex].host == session.playerName) {
        if (gameState.rooms[roomIndex].state == roomStates.lobby) {
          gameState.rooms[roomIndex].category = data.category;
          sendUpdateRoom(session.roomID);
        } else {
          socket.emit('showError', {message: "Room is not in state lobby"});
        }
      } else {
        socket.emit('showError', {message: "User is not host. Not allowed to change category"});
      }
    } catch(error) {
      log("ERROR 006: " + JSON.stringify(error, ["message", "arguments", "type", "name"]));
      try {
        socket.emit('showError', {message: "ERROR 006: " + error.message});
      } catch{}
    }
  });

  //Set WordList
  socket.on('setWordList', dataString => {
    try{
      let data = JSON.parse(dataString);
      if (session.roomID != null){
        let roomIndex = getRoomIndex(session.roomID);
        let playerIndex = getPlayerIndex(session.roomID, session.playerName);
        if (gameState.rooms[roomIndex].state == roomStates.addingWords) {
          gameState.rooms[roomIndex].players[playerIndex].wordList = data.list.slice(0, gameState.settings.minWords);
          updateReadyWordStatus(session.roomID, session.playerName);
          sendUpdateRoom(session.roomID);
        } else {
          socket.emit('showError', {message: "Room is not in state Adding Words"});
        }
      } else {
        socket.emit('showError', {message: "Can't set word list. User is in a room"});
      }
    } catch(error) {
      log("ERROR 007: " + JSON.stringify(error, ["message", "arguments", "type", "name"]));
      try {
        socket.emit('showError', {message: "ERROR 007: " + error.message});
      } catch{}
    }
  });

  //Change Name
  socket.on('changeName', dataString => {
    try{
      let data = JSON.parse(dataString);
      let newName = data.newName;
      let roomIndex = getRoomIndex(session.roomID);
      let playerIndex = getPlayerIndex(session.roomID, session.playerName);
      if (session.roomID != null){
        if (gameState.rooms[roomIndex].players.some(player => player.name === newName)) {
          socket.emit('showError', {message: "Name already in use"});
        } else {
          gameState.rooms[roomIndex].players[playerIndex].name = newName
          let oldName = session.playerName;
          session.playerName = newName;
          if (gameState.rooms[roomIndex].host == oldName) {
            gameState.rooms[roomIndex].host = newName
          }
          if (gameState.rooms[roomIndex].lastWinner == oldName) {
            gameState.rooms[roomIndex].lastWinner = newName
          }
          sendUpdateRoom(session.roomID);
        }
      } else {
        socket.emit('showError', {message: "Can't change name. User is in a room"});
      }
    } catch(error) {
      log("ERROR 008: " + JSON.stringify(error, ["message", "arguments", "type", "name"]));
      try {
        socket.emit('showError', {message: "ERROR 008: " + error.message});
      } catch{}
    }
  });

  //Change Host
  socket.on('changeHost', dataString => {
    try{
      let data = JSON.parse(dataString);
      let newHost = data.newHost;
      let roomIndex = getRoomIndex(session.roomID);
      if (session.roomID != null){
        if (session.playerName == gameState.rooms[roomIndex].host) {
          if (!gameState.rooms[roomIndex].players.some(player => player.name === newHost)) {
            socket.emit('showError', {message: "New host name does not exist"});
          } else {
            gameState.rooms[roomIndex].host = newHost;
            sendUpdateRoom(session.roomID);
          }
        } else {
          socket.emit('showError', {message: "User is not host"});
        }
      } else {
        socket.emit('showError', {message: "Can't change host User is in a room"});
      }
    } catch(error) {
      log("ERROR 009: " + JSON.stringify(error, ["message", "arguments", "type", "name"]));
      try {
        socket.emit('showError', {message: "ERROR 009: " + error.message});
      } catch{}
    }
  });

  //Change Scores
  socket.on('changePlayerScore', dataString => {
    try{
      let data = JSON.parse(dataString);
      let player = data.player;
      let score = data.score;
      if (session.roomID != null){
        if (session.playerName == gameState.rooms[getRoomIndex(session.roomID)].host) {
          if (gameState.rooms[getRoomIndex(session.roomID)].players.some(player => player.name === player)) {
            gameState.rooms[getRoomIndex(session.roomID)].players[getPlayerIndex(player)].score = score;
            sendUpdateRoom(session.roomID);
          } else {
            socket.emit('showError', {message: "Player does not exist"});
          }
        } else {
          socket.emit('showError', {message: "User is not host"});
        }
      } else {
        socket.emit('showError', {message: "Can't change host User is in a room"});
      }
    } catch(error) {
      log("ERROR 010: " + JSON.stringify(error, ["message", "arguments", "type", "name"]));
      try {
        socket.emit('showError', {message: "ERROR 010: " + error.message});
      } catch{}
    }
  });

  //Kick Player
  socket.on('kickPlayer', dataString => {
    try{
      let data = JSON.parse(dataString);
      let player = data.player;
      if (session.roomID != null){
        if (session.playerName == gameState.rooms[getRoomIndex(session.roomID)].host) {
          if (gameState.rooms[getRoomIndex(session.roomID)].players.some(player => player.name === player)) {
            io.to(gameState.rooms[getRoomIndex(session.roomID)].players[getPlayerIndex(player).socketID]).emit('disconnect');
            sendUpdateRoom(session.roomID);
          } else {
            socket.emit('showError', {message: "Player does not exist"});
          }
        } else {
          socket.emit('showError', {message: "User is not host"});
        }
      } else {
        socket.emit('showError', {message: "Can't change host User is in a room"});
      }
    } catch(error) {
      log("ERROR 011: " + JSON.stringify(error, ["message", "arguments", "type", "name"]));
      try {
        socket.emit('showError', {message: "ERROR 011: " + error.message});
      } catch{}
    }
  });

  //Guess Artist
  socket.on('guessArtist', dataString => {
    try{
      let data = JSON.parse(dataString);
      let player = data.player;
      if (session.roomID != null){
        if (gameState.rooms[roomIndex].state != roomStates.addingWords) {
          if (session.playerName == gameState.rooms[getRoomIndex(session.roomID)].host) {
            if (gameState.rooms[getRoomIndex(session.roomID)].players.some(player => player.name === player)) {
              if (gameState.rooms[getRoomIndex(session.RoomID)].artist == player) {
                //was artist
                gameState.rooms[getRoomIndex(session.RoomID)].state = roomStates.playingGame;
                //scores
                //send was artist emmit
                //
              } else {
                //was not artist
                //set points
                //if < 3 lef tto guess - force guess artist

              }
            } else {
              socket.emit('showError', {message: "Player does not exist"});
            }
          } else {
            socket.emit('showError', {message: "User is not host"});
          }
        } else {
          socket.emit('showError', {message: "Room not in correct state"});
        }
      } else {
        socket.emit('showError', {message: "Can't change host User is in a room"});
      }
    } catch(error) {
      log("ERROR 012: " + JSON.stringify(error, ["message", "arguments", "type", "name"]));
      try {
        socket.emit('showError', {message: "ERROR 012: " + error.message});
      } catch{}
    }
  });

  //Disconnected
  socket.on('disconnect', dataString => {
    try{
      //let data = JSON.parse(dataString);
      if (session.roomID != null) {
        log("Disconnected " + session.playerName + " from " + session.roomID + " " + session.socketID);
        playerRemove(session.roomID, session.playerName);
      } else {
        log("Disconnected blank connection " + session.socketID);
      }
    } catch(error) {
      log("ERROR 013: " + JSON.stringify(error, ["message", "arguments", "type", "name"]));
      try {
        socket.emit('showError', {message: "ERROR 013: " + error.message});
      } catch{}
    }
  });

  socket.on('lockLobby', dataString => {
    try{
      let roomIndex = getRoomIndex(session.roomID);
      if (gameState.rooms[roomIndex].host == session.playerName) {
        if (gameState.rooms[roomIndex].state == roomStates.lobby) {
          if (gameState.rooms[roomIndex].category != "") {
            if (gameState.rooms[roomIndex].players.length > 1) {
              gameState.rooms[roomIndex].state = roomStates.addingWords;
              for (let i = 0; i < gameState.rooms[roomIndex].players.length; i++) {
                gameState.rooms[roomIndex].players[i].state = playerStates.addingWords;
              }
              sendUpdateRoom(session.roomID);
            } else {
              socket.emit('showError', {message: "Need more players"});
            }
          } else {
            socket.emit('showError', {message: "Category has not been set"});
          }
        } else {
          socket.emit('showError', {message: "Room is not in state lobby"});
        }
      } else {
        socket.emit('showError', {message: "User is not host. Not allowed to start game"});
      }
    } catch(error) {
      log("ERROR 014: " + JSON.stringify(error, ["message", "arguments", "type", "name"]));
      try {
        socket.emit('showError', {message: "ERROR 014: " + error.message});
      } catch{}
    }
  });

});
