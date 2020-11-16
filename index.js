var express = require('express')
var app = express()
var http = require('http')
var server = http.Server(app)
var ior = require('socket.io')
var io = ior().listen(server, {
  cors: {
    origin: '*',
    credentials: true
  },
  transports: ['websocket','polling']
})
app.get('/rooms', (req, res) => {
  res.send(gameState.rooms.length.toString());
});
app.get('/logs', (req, res) => {
  res.send(logData);
});
app.get('/gameState', (req, res) => {
  if (gameState.settings.debugMode) {
    res.send(gameState);
  }
});
const roomCharList = ["B", "C", "D", "F", "G", "H", "J", "K", "M", "N", "P", "R", "S", "T", "W", "X", "Y", "Z"];
const errorTypes = {
serverError: 0,
allRoomsFull : 100,
roomInfoNotInRoom: 101,
joinRoomNameTaken: 102,
joinRoomNotInLobby: 103,
joinRoomDoesNotExist: 104,
joinRoomNameEmpty: 105,
joinRoomRoomIDEmpty: 106,
createRoomNameEmpty: 107,
setCategoryNotInRoom: 108,
setCategoryRoomNotInLobby: 109,
setCategoryUserNotHost: 110,
setWordListNotValid: 111,
setWordListWrongRoomState: 112,
setWordListNotInRoom: 113,
setNameInUse: 114,
setNameIsEmpty: 115,
setNameNotInRoom: 116,
changeHostUserNotHost: 117,
changeHostNotInRoom: 118,
changeScoreNotValid: 119,
changeScoreUserDoesNotExist: 120,
changeScoreUserNotHost: 121,
changeScoreUserNotInRoom: 122,
kickPlayerDoesNotExist: 123,
kickPlayerUserNotHost: 124,
kickPlayerNotInRoom: 125,
guessArtistAlreadyGuessed: 216,
guessArtistDoesNotExist: 127,
guessArtistNotHost: 128,
guessArtistWrongRoomState: 129,
guessArtistNotInRoom: 130,
startGameNeedMorePlayers: 131,
startGameNoCategory: 132,
startGameWrongRoomState: 133,
startGameUserNotHost: 134,
startGameNotInRoom: 135,
guessWordWrongRoomState: 136,
guessWordNotHost: 137,
guessWordNotInRoom:138,
newGameNotHost: 139,
newGameNotInRoom: 140,
setCategoryNoInput: 141,
}
const playerStates = {
  lobby: 0, addingWords: 1, addedWords: 2
};
const roomStates = {
  lobby:0, addingWords: 1, playingGame: 2, artistGuessed: 3, wordGuessed: 4
};
var gameState = {
  server: {
    version: "0.2.3",
    name: "testServer",
    desc: "This is a test server"
  },
  categorys: ["Cat1", "Cat2", "Cat3"],
  settings: {
    minWords: 3,
    debugMode: false,
    scores: {
      artistDiscovered: 1,
      artistEvaded: 2,
      artistGuessedWord: 1
    }
  },
  rooms: []
};
var logData = [];

if (process.env.NAME != null) {
  gameState.server.name = process.env.NAME
}
if (process.env.DESC != null) {
  gameState.server.DESC = process.env.DESC
}

function log(message) {
  let dateString = new Date().toISOString()
  console.log(dateString + " - " + message);
  logData.push(dateString + " - " + message);
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
  let i = 0;
  let maxCount = Math.pow(roomCharList.length, 4);
  do {
    roomName = genRoomName();
    if (!gameState.rooms.some(room => room.id === roomName)) {
      roomNameInvalid = false;
    }
    i += 1;
  } while((roomNameInvalid) && (i < maxCount))
  if (!roomNameInvalid) {
    roomData = {
      id: roomName,
      state: 0,
      word: "",
      category: "",
      artist: "",
      lastArtist: "",
      host: playerName,
      players: [{
        name: playerName,
        state: 0,
        wordList: [],
        score: 0,
        socketID: socketID,
        guessed: false
      }]
    }
    gameState.rooms.push(roomData);
    return roomName;
  } else {
    log("ERROR: Room name list full!");
    io.to(socketID).emit('showError', {type: errorTypes.allRoomsFull, message: "All rooms are taken. Please try again later"});
  }
}

function updateReadyWordStatus(roomID, playerName) {
  //Set player
  let roomIndex = getRoomIndex(roomID);
  let playerIndex = getPlayerIndex(roomID, playerName)
  player = gameState.rooms[roomIndex].players[playerIndex];
  if (player.wordList.length == gameState.settings.minWords){
    gameState.rooms[roomIndex].players[playerIndex].state = playerStates.addedWords;
  } else {
    gameState.rooms[roomIndex].players[playerIndex].state = playerStates.addingWords;
  }
  //Set Server
  if (!gameState.rooms[roomIndex].players.some(player => player.state == playerStates.addingWords)) {
    gameState.rooms[roomIndex].state = roomStates.playingGame;
    let totalWordList = []
    for (let i = 0; i < gameState.rooms[roomIndex].players.length; i++) {
      totalWordList.concat(gameState.rooms[roomIndex].players[i].wordList);
    }
    gameState.rooms[roomIndex].word = totalWordList[Math.floor(Math.random() * totalWordList.length)]
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
    log("Room " + roomID + " is empty, removeing");
    gameState.rooms.splice(roomIndex, 1);
  } else {
    if (gameState.rooms[roomIndex].host == playerName) {
      //If player was host, set new host
      gameState.rooms[roomIndex].host = gameState.rooms[roomIndex].players[0].name;
      log("Room " + roomID + " Host " + playerName + " left, switched to " + gameState.rooms[roomIndex].host);
    }
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
    io.to(player.socketID).emit('roomInfo', getRoomInfo(roomID, player.name));
  }
}

function getNonGuessedLeft(roomID) {
  let room = gameState.rooms.find(element => element.id === roomID);
  let playersLeft = 0;
  for (let i = 0; i < room.players.length; i++) {
    if (!room.players[i].guessed) {
      playersLeft =+ 1;
    }
  }
  return playersLeft;
}

function getRoomInfo(roomID, playerName) {
  let room = gameState.rooms.find(element => element.id === roomID);
  returnData = {
    id: room.id,
    host: room.host,
    playerName: playerName,
    state: room.state,
    category: room.category,
    players: [],
    lastArtist: room.lastArtist,
    minWords: gameState.settings.minWords
  }
  if (playerName != room.artist) {
    returnData.word = room.word;
  } else {
    returnData.word = "";
  }
  if ((playerName != room.artist) || (room.state >= roomStates.artistGuessed)) {
    returnData.artist = "";
  } else {
    returnData.artist = room.artist;
  }
  if ((room.host == playerName) && (room.state == roomStates.lobby)) {
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
      returnData.wordList = player.wordList;
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
      //let data = dataString;
      log(socket.id + " asked for server info");
      let serverInfo = gameState.server;
      serverInfo.minWords = gameState.settings.minWords;
      serverInfo.roomCharList = roomCharList;
      socket.emit('serverInfo', serverInfo);
    } catch(error) {
      log("ERROR : 001" + JSON.stringify(error, ["message", "arguments", "type", "name"]));
      try {
        socket.emit('showError', {type: errorTypes.serverError, message: "ERROR 001: " + error.message});
      } catch{}
    }
  });

  //Debug Gamestate
  socket.on('gameState', dataString => {
    try{
      let data = dataString;
      if (gameState.settings.debugMode){
        socket.emit('serverInfo', gameState);
      }
    } catch(error) {
      log("ERROR 002: " + JSON.stringify(error, ["message", "arguments", "type", "name"]));
      try {
        socket.emit('showError', {type: errorTypes.serverError, message: "ERROR 002:" + error.message});
      } catch{}
    }
  });

  //RoomInfo
  socket.on('roomInfo', dataString => {
    try{
      let data = dataString;
      if (session.roomID != null){
        socket.emit('roomInfo', getRoomInfo(session.roomID, session.playerName));
      } else {
        socket.emit('showError', {type: errorTypes.roomInfoNotInRoom, message: "Can't get room info. User is in a room"});
      }
    } catch(error) {
      log("ERROR 003: " + JSON.stringify(error, ["message", "arguments", "type", "name"]));
      try {
        socket.emit('showError', {type: errorTypes.serverError, message: "ERROR 003:" + error.message});
      } catch{}
    }
  });

  //JoinRoom
  socket.on('joinRoom', dataString => {
    try{
      let data = dataString;
      let roomID = data.roomID;
      let playerName = data.playerName;
      if (roomID == "" || roomID == null){
        socket.emit('showError', {type: errorTypes.joinRoomRoomIDEmpty, message: "No room ID sent"});
      } else {
        if (playerName == "" || playerName == null){
          socket.emit('showError', {type: errorTypes.joinRoomNameEmpty, message: "No player name sent"});
        } else {
          if (gameState.rooms.some(room => room.id === roomID)) {
            let room = gameState.rooms.find(element => element.id === roomID);
            if (room.state == roomStates.lobby) {
              if (!room.players.some(player => player.name === playerName)) {
                if (session.roomID != null) {
                  playerRemove(session.roomID, session.playerName);
                }
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
                log(playerName + " joined " + roomID);
              } else {
                socket.emit('showError', {type: errorTypes.joinRoomNameTaken, message: "Name already taken"});
                log(playerName + " failed to join " + roomID + " Name already taken");
              }
            } else {
              socket.emit('showError', {type: errorTypes.joinRoomNotInLobby, message: "Room is not in lobby"});
              log(playerName + " failed to join " + roomID + " Room not in lobby");
            }
          } else {
            socket.emit('showError', {type: errorTypes.joinRoomDoesNotExist, message: "Room does not exist"});
            log(playerName + " failed to join " + roomID + " Room does not exist");
          }
        }
      }
    } catch(error) {
      log("ERROR 004: " + JSON.stringify(error, ["message", "arguments", "type", "name"]));
      try {
        socket.emit('showError', {type: errorTypes.serverError, message: "ERROR 004: " + error.message});
      } catch{}
    }
  });

  //NewRoom
  socket.on('createRoom', dataString => {
    try{
      if (session.roomID != null) {
        playerRemove(session.roomID, session.playerName);
      }
      let data = dataString;
      let playerName = data.playerName;
      if (playerName == "" || playerName == null){
        socket.emit('showError', {type: errorTypes.createRoomNameEmpty, message: "No player name sent"});
      } else {
        let roomID = createRoom(playerName, session.socketID);
        session.roomID = roomID;
        session.playerName = playerName;
        socket.join('Room'+roomID)
        sendUpdateRoom(roomID);
        log(playerName + " created " + roomID);
      }
    } catch(error) {
      log("ERROR 005: " + JSON.stringify(error, ["message", "arguments", "type", "name"]));
      try {
        socket.emit('showError', {type: errorTypes.serverError, message: "ERROR 005: " + error.message});
      } catch{}
    }
  });

  //setCategory
  socket.on('setCategory', dataString => {
    try{
      if (session.roomID != null) {
        let data = dataString;
          let roomIndex = getRoomIndex(session.roomID);
          if (gameState.rooms[roomIndex].host == session.playerName) {
            if (gameState.rooms[roomIndex].state == roomStates.lobby) {
              gameState.rooms[roomIndex].category = data.category;
              log(session.playerName + " in room " + session.roomID + " set category to " + data.category);
              sendUpdateRoom(session.roomID);
            } else {
              socket.emit('showError', {type: errorTypes.setCatagoryRoomNotInLobby, message: "Room is not in state lobby"});
              log(session.playerName + " in room " + session.roomID + " failed to set category to " + data.category + " Room not in lobby");
            }
          } else {
            socket.emit('showError', {type: errorTypes.setCategoryUserNotHost, message: "User is not host. Not allowed to change category"});
            log(session.playerName + " in room " + session.roomID + " failed to set category to " + data.category + " User not host");
          }
        } else {
          socket.emit('showError', {type: errorTypes.setCategoryNoInput, message: "Can't set category no input"});
        }
    } catch(error) {
      log("ERROR 006: " + JSON.stringify(error, ["message", "arguments", "type", "name"]));
      try {
        socket.emit('showError', {type: errorTypes.serverError, message: "ERROR 006: " + error.message});
      } catch{}
    }
  });

  //Set WordList
  socket.on('setWordList', dataString => {
    //TODO check for empty/invalid words
    try{
      let data = dataString;
      if (session.roomID != null){
        let wordValid = true;
        if (data.wordList == null || data.wordList.length == 0) {
          wordValid = false;
        } else {
          for (let i = 0; i < data.wordList.length; i++) {
            if (data.wordList[i] == "" || data.wordList[i] == null) {
              wordValid = false;
            }
          }
        }
        if(wordValid) {
          let roomIndex = getRoomIndex(session.roomID);
          let playerIndex = getPlayerIndex(session.roomID, session.playerName);
          if (gameState.rooms[roomIndex].state == roomStates.addingWords) {
            gameState.rooms[roomIndex].players[playerIndex].wordList = data.wordList.slice(0, gameState.settings.minWords);
            updateReadyWordStatus(session.roomID, session.playerName);
            sendUpdateRoom(session.roomID);
            log(session.playerName + " in room " + session.roomID + " updated word list");
          } else {
            socket.emit('showError', {type: errorTypes.setWordListWrongRoomState, message: "Room is not in state Adding Words"});
            log(session.playerName + " in room " + session.roomID + " failed to add words Room in wrong state");
          }
        } else {
          socket.emit('showError', {type: errorTypes.setWordListNotValid, message: "Word list not valid"});
        }
      } else {
        socket.emit('showError', {type: errorTypes.setWordListNotInRoom, message: "Can't set word list. User is not in a room"});
      }
    } catch(error) {
      log("ERROR 007: " + JSON.stringify(error, ["message", "arguments", "type", "name"]));
      try {
        socket.emit('showError', {type: errorTypes.serverError, message: "ERROR 007: " + error.message});
      } catch{}
    }
  });

  //Change Name
  socket.on('changeName', dataString => {
    try{
      let data = dataString;
      let newName = data.newName;
      let roomIndex = getRoomIndex(session.roomID);
      let playerIndex = getPlayerIndex(session.roomID, session.playerName);
      if (session.roomID != null){
        if (newName == "" || newName == null) {
          socket.emit('showError', {type: errorTypes.setNameIsEmpty, message: "Name invalid"});
        } else {
          if (gameState.rooms[roomIndex].players.some(player => player.name === newName)) {
            socket.emit('showError', {type: errorTypes.setNameInUse, message: "Name already in use"});
          } else {
            gameState.rooms[roomIndex].players[playerIndex].name = newName
            let oldName = session.playerName;
            session.playerName = newName;
            if (gameState.rooms[roomIndex].host == oldName) {
              gameState.rooms[roomIndex].host = newName
            }
            if (gameState.rooms[roomIndex].lastArtist == oldName) {
              gameState.rooms[roomIndex].lastArtist = newName
            }
            log(oldName + " in room " + session.roomID + " changed name to " + newName);
            sendUpdateRoom(session.roomID);
          }
        }
      } else {
        socket.emit('showError', {type: errorTypes.setNameNotInRoom, message: "Can't change name. User is not in a room"});
      }
    } catch(error) {
      log("ERROR 008: " + JSON.stringify(error, ["message", "arguments", "type", "name"]));
      try {
        socket.emit('showError', {type: errorTypes.serverError, message: "ERROR 008: " + error.message});
      } catch{}
    }
  });

  //Change Host
  socket.on('changeHost', dataString => {
    try{
      let data = dataString;
      let newHost = data.newHost;
      let roomIndex = getRoomIndex(session.roomID);
      if (session.roomID != null){
        if (session.playerName == gameState.rooms[roomIndex].host) {
          if (!gameState.rooms[roomIndex].players.some(player => player.name === newHost)) {
            socket.emit('showError', {message: "New host name does not exist"});
          } else {
            gameState.rooms[roomIndex].host = newHost;
            sendUpdateRoom(session.roomID);
            log(session.playerName + " in room " + session.roomID + " changed host to " + newHost);
          }
        } else {
          socket.emit('showError', {type: errorTypes.changeHostUserNotHost, message: "User is not host"});
          log(session.playerName + " in room " + session.roomID + " failed to change host to " + newHost + "User not host");
        }
      } else {
        socket.emit('showError', {type: errorTypes.changeHostNotInRoom, message: "Can't change host User is in a room"});
      }
    } catch(error) {
      log("ERROR 009: " + JSON.stringify(error, ["message", "arguments", "type", "name"]));
      try {
        socket.emit('showError', {type: errorTypes.serverError, message: "ERROR 009: " + error.message});
      } catch{}
    }
  });

  //Change Scores
  socket.on('changeScore', dataString => {
    try{
      let data = dataString;
      let subjectPlayer = data.playerName;
      let score = parseInt(data.newScore);
      if (session.roomID != null){
        let roomIndex = getRoomIndex(session.roomID);
        let playerIndex = getPlayerIndex(session.roomID, session.playerName);
        let subjectPlayerIndex = getPlayerIndex(session.roomID, subjectPlayer);
        if (session.playerName == gameState.rooms[roomIndex].host) {
          if (gameState.rooms[roomIndex].players.some(player => player.name === subjectPlayer)) {
            if (score >= 0) {
              gameState.rooms[roomIndex].players[subjectPlayerIndex].score = score;
              sendUpdateRoom(session.roomID);
              log(session.playerName + " in room " + session.roomID + " changed score: " + subjectPlayer + "->" + score);
            } else {
              socket.emit('showError', {type: errorTypes.changeScoreNotValid, message: "Score must be a positive interger"});
              log(session.playerName + " in room " + session.roomID + " failed to changed score: " + subjectPlayer + "->" + score + " Score not positive interger");
            }
          } else {
            socket.emit('showError', {type: errorTypes.changeScoreUserDoesNotExist, message: "Player does not exist"});
            log(session.playerName + " in room " + session.roomID + " failed to changed score: " + subjectPlayer + "->" + score + "Player Subject does not exist");
          }
        } else {
          socket.emit('showError', {type: errorTypes.changeScoreUserNotHost, message: "User is not host"});
          log(session.playerName + " in room " + session.roomID + " failed to changed score: " + " subjectPlayer->" + score + "Player is not host");
        }
      } else {
        socket.emit('showError', {type: errorTypes.changeScoreUserNotInRoom, message: "Can't change Score User is not in a room"});
      }
    } catch(error) {
      log("ERROR 010: " + JSON.stringify(error, ["message", "arguments", "type", "name"]));
      try {
        socket.emit('showError', {type: errorTypes.serverError, message: "ERROR 010: " + error.message});
      } catch{}
    }
  });

  //Kick Player
  socket.on('kickPlayer', dataString => {
    try{
      let data = dataString;
      let subjectPlayer = data.playerName;
      if (session.roomID != null){
        if (session.playerName == gameState.rooms[getRoomIndex(session.roomID)].host) {
          if (gameState.rooms[getRoomIndex(session.roomID)].players.some(player => player.name === subjectPlayer)) {
            io.to(gameState.rooms[getRoomIndex(session.roomID)].players[getPlayerIndex(subjectPlayer).socketID]).emit('disconnect');
            sendUpdateRoom(session.roomID);
            log(session.playerName + " in room " + session.roomID + " kicked " + subjectPlayer);
          } else {
            socket.emit('showError', {type: errorTypes.kickPlayerDoesNotExist, message: "Player does not exist"});
            log(session.playerName + " in room " + session.roomID + " failed to kick " + subjectPlayer + " Player does not exist");
          }
        } else {
          socket.emit('showError', {type: errorTypes.kickPlayerUserNotHost, message: "User is not host"});
          log(session.playerName + " in room " + session.roomID + " failed to kick " + subjectPlayer + "Player not host");
        }
      } else {
        socket.emit('showError', {type: errorTypes.kickPlayerNotInRoom, message: "Can't change host User is in a room"});
      }
    } catch(error) {
      log("ERROR 011: " + JSON.stringify(error, ["message", "arguments", "type", "name"]));
      try {
        socket.emit('showError', {type: errorTypes.serverError, message: "ERROR 011: " + error.message});
      } catch{}
    }
  });

  //Guess Artist
  socket.on('guessArtist', dataString => {
    //TODO check if player has already been guessed
    try{
      let data = dataString;
      let playerGuess = data.playerName;
      if (session.roomID != null){
        let playerGuessIndex = getPlayerIndex(session.roomID, playerGuess);
        let roomIndex = getRoomIndex(session.roomID);
        if (gameState.rooms[roomIndex].state == roomStates.playingGame) {
          if (session.playerName == gameState.rooms[getRoomIndex(session.roomID)].host) {
            if (gameState.rooms[roomIndex].players.some(player => player.name === playerGuess)) {
              if (!gameState.rooms[roomIndex].players.some(player => player.name === playerGuess).guessed) {
                if (gameState.rooms[roomIndex].artist == playerGuess) {
                  gameState.rooms[roomIndex].state = roomStates.artistGuessed;
                  for(let i = 0; i < gameState.rooms[roomIndex].players.length; i++) {
                    if (gameState.rooms[roomIndex].players[i].name != playerGuess) {
                      gameState.rooms[roomIndex].players[i].score += gameState.settings.scores.artistDiscovered;
                    }
                  }
                  sendUpdateRoom(session.roomID);
                  log(session.playerName + " in room " + session.roomID + " Correctly guessed " + playerGuess + " Was the artist");
                } else {
                  //was not artist
                  gameState.rooms[roomIndex].players[getPlayerIndex(roomID, gameState.rooms[roomIndex].artist)].score += gameState.settings.scores.artistEvaded;
                  gameState.rooms[roomID].players[playerGuessIndex].guessed = true;
                  log(session.playerName + " in room " + session.roomID + " Incorrectly guessed " + playerGuess + " Was the artist");
                  if (getNonGuessedLeft(roomID) < 2) {
                    gameState.rooms[roomIndex].state = roomStates.artistGuessed;
                    log(session.playerName + " in room " + session.roomID + " Incorrectly guessed " + playerGuess + " Was the artist. Game progressed as only artist left unguessed");
                  }
                  sendUpdateRoom(session.roomID);
                }
              } else {
                socket.emit('showError', {type: errorTypes.guessArtistAlreadyGuessed, message: "Already guessed this player"});
              }
            } else {
              socket.emit('showError', {type: errorTypes.guessArtistDoesNotExist, message: "Player does not exist"});
            }
          } else {
            socket.emit('showError', {type: errorTypes.guessArtistNotHost, message: "User is not host"});
          }
        } else {
          socket.emit('showError', {type: errorTypes.guessArtistWrongRoomState, message: "Room not in correct state"});
        }
      } else {
        socket.emit('showError', {type: errorTypes.guessArtistNotInRoom, message: "Can't guess User is in a room"});
      }
    } catch(error) {
      log("ERROR 012: " + JSON.stringify(error, ["message", "arguments", "type", "name"]));
      try {
        socket.emit('showError', {type: errorTypes.serverError, message: "ERROR 012: " + error.message});
      } catch{}
    }
  });

  //Disconnected
  socket.on('disconnect', dataString => {
    try{
      //let data = dataString;
      if (session.roomID != null) {
        log("Disconnected " + session.playerName + " from " + session.roomID + " Session: " + session.socketID);
        playerRemove(session.roomID, session.playerName);
      } else {
        log("Disconnected blank connection Session: " + session.socketID);
      }
    } catch(error) {
      log("ERROR 013: " + JSON.stringify(error, ["message", "arguments", "type", "name"]));
      try {
        socket.emit('showError', {type: errorTypes.serverError, message: "ERROR 013: " + error.message});
      } catch{}
    }
  });

  socket.on('startGame', dataString => {
    try{
      if (session.roomID != null){
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
                log(session.playerName + " in room " + session.roomID + " Started Game");
              } else {
                socket.emit('showError', {type: errorTypes.startGameNeedMorePlayers, message: "Need more players"});
                log(session.playerName + " in room " + session.roomID + " Could not start game. Not enough players");
              }
            } else {
              socket.emit('showError', {type: errorTypes.startGameNoCategory, message: "Category has not been set"});
              log(session.playerName + " in room " + session.roomID + " Could not start game. Category not set");
            }
          } else {
            socket.emit('showError', {type: errorTypes.startGameWrongRoomState, message: "Room is not in correct state"});
            log(session.playerName + " in room " + session.roomID + " Could not start game. Room is not in lobby");
          }
        } else {
          socket.emit('showError', {type: errorTypes.startGameUserNotHost, message: "User is not host. Not allowed to start game"});
          log(session.playerName + " in room " + session.roomID + " Could not start game. Player is not host");
        }
        } else {
          socket.emit('showError', {type: errorTypes.startGameNotInRoom, message: "Can't start game not in room"});
        }
    } catch(error) {
      log("ERROR 014: " + JSON.stringify(error, ["message", "arguments", "type", "name"]));
      try {
        socket.emit('showError', {type: errorTypes.serverError, message: "ERROR 014: " + error.message});
      } catch{}
    }
  });

  socket.on('guessWord', dataString => {
    try{
      if (session.roomID != null){
        let roomIndex = getRoomIndex(session.roomID);
        if (gameState.rooms[roomIndex].host == session.playerName) {
          let data = dataString;
          let wasCorrect = data.wasCorrect
          //Check - is this actually a bool?
          if (gameState.rooms[roomIndex].state == roomStates.artistGuessed) {
            gameState.rooms[roomIndex].state = roomStates.wordGuessed;
            if (wasCorrect) {
              gameState.rooms[roomIndex].players[getPlayerIndex(roomID, gameState.rooms[roomIndex].artist)].score += gameState.settings.scores.artistGuessedWord;
              log(session.playerName + " in room " + session.roomID + " Artist correctly guessed word");
            } else {
              log(session.playerName + " in room " + session.roomID + " Artist incorrectly guessed word");
            }
            sendUpdateRoom(session.roomID);
          } else {
            socket.emit('showError', {type: errorTypes.guessWordWrongRoomState, message: "Room is not in state artist guessed"});
            log(session.playerName + " in room " + session.roomID + " Artist could not guess word. Room in wrong state");
          }
        } else {
          socket.emit('showError', {type: errorTypes.guessWordNotHost, message: "User is not host"});
          log(session.playerName + " in room " + session.roomID + " Artist could not guess word. User is not host");
        }
      } else {
        socket.emit('showError', {type: errorTypes.guessWordNotInRoom, message: "Can't guess not in room"});
      }
    } catch(error) {
      log("ERROR 015: " + JSON.stringify(error, ["message", "arguments", "type", "name"]));
      try {
        socket.emit('showError', {type: errorTypes.serverError, message: "ERROR 015: " + error.message});
      } catch{}
    }
  });

  socket.on('newGame', dataString => {
    try{
      if (session.roomID != null){
        let roomIndex = getRoomIndex(session.roomID);
        if (gameState.rooms[roomIndex].host == session.playerName) {
          let oldRoom = gameState.rooms[roomIndex];
          let oldPlayers = gameState.rooms[roomIndex].players;
          let newRoom = {
            id: oldRoom.id,
            state: 0,
            word: "",
            category: "",
            artist: "",
            lastArtist: oldRoom.artist,
            host: oldRoom.host,
            players: []
          }
          for (let i = 0; i < oldRoom.players.length; i++) {
            newRoom.players.push({
              name: oldRoom.players[i].name,
              state: 0,
              wordList: [],
              score: oldRoom.players[i].score,
              socketID: oldRoom.players[i].socketID,
              guessed: false
            })
          }
          sendUpdateRoom(session.roomID);
          log(session.playerName + " in room " + session.roomID + " Room Reset");
        } else {
          socket.emit('showError', {type: errorTypes.newGameNotHost, message: "User is not host. Not allowed to restart game"});
          log(session.playerName + " in room " + session.roomID + " Could not reset room. Player is not host");
        }
      } else {
        socket.emit('showError', {type: errorTypes.newGameNotInRoom, message: "Can't restart game, not in room"});
      }
    } catch(error) {
      log("ERROR 016: " + JSON.stringify(error, ["message", "arguments", "type", "name"]));
      try {
        socket.emit('showError', {type: errorTypes.serverError, message: "ERROR 016: " + error.message});
      } catch{}
    }
  });

});
server.listen(3000);
