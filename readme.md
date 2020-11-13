# API Reference #

# Backround #
FFA communicates using socket.io. New connections will remain unassigned before joining a game, at which point the socket saves the room and player IDs and joins the appropriate socket.io "room"

## Client Listeners ##


### Server Info ###
**Event:** `serverInfo`

**Data:**
```
{version: "0.0.1", name: "TestServer"}
```
**Notes:**



### Show Error ###
**Event:** `showError`

**Data:**
```
{message: "Uh oh, this is an error"}
```
**Notes:**
The message should be displayed to the user.

### Room Info ###
**Event:** `roomInfo`

**Data:**
```
{"id": "QWRT",
"host": "Dave",
"state": 0,
"categorys": ["Cat1","Cat2","Cat3"],
"category": "My Category",
"word":"",
"artist": "",
"minWords: 3,
"players": [{
 "name": "Dave",
 "state": 0,
 "score": 0,
 "wordCount": 0,
 "guessed": false,
 "wordlist":[]
 }],
"lastArtist": ""
```
**Notes:**
The most used data. This will be sent to the client upon any change to the room. The exact data retuned may differ based on the player and state of the room.
For room and player states see index.js

* categorys will only be sent if player is host
* word will only be sent to the non artists, otherwise it is a blank string
* artist will only be sent if player is artist or to all players in roomstates after artist is found. Otherwise it is a blank string
* wordlist will only be sent to the same player otherwise it is not set
* lastArtist is the artist name from the last round, if more than one round played


## Client Emitters ##


### Get Server Info ###

**Event:** `serverInfo`

**Data:** `{}`

**Requirements:** none

**Result:** Return Data emitted to client `serverInfo`


### Get Game State ###

**Event:** `gameState`

**Data:** `{}`

**Requirements:** Server in debugMode

**Result:** Emits entire game state to client `serverInfo`


### Get Room Info ###

**Event:** `roomInfo`

**Data:** `{}`

**Requirements:** Player be in a room

**Result:** Emits `roomInfo` to client


### Create a new room ###

**Event:** `createRoom`

**Data:**`{playerName: "PlayerOne"}`

**Requirements:** none

**Result:** server will emit `roomInfo` back to client


### Set Category ###

**Event:** `setCategory`

**Data:** `{category: "MyCategory"}`

**Requirements:**
* Be joined to a room
* Be host of the room
* Room is in state "lobby"

**Result:** If successful `serverInfo` will be emitted to all in room.


### Add Word List ###

**Event:** `setWordList`

**Data:** `{list: ["word1", "word2", "word3"]}`

**Requirements:**
* Be joined to a room
* Room is in state "addingWords"

**Result:** `roomInfo` will be emitted back to client, with players word list. All items after the minWords setting will be ignored


### Change Name ###

**Event:** `changeName`

**Data:** `{"newName": "Dave2"}`

**Requirements:**
* Be joined to a room

**Result:** `roomInfo` will be emitted back to client


### Change Host ###

**Event:** `changeHost`

**Data:** `{"newHost": "Dave2"}`

**Requirements:**
* Be joined to a room
* Player is current host
* newHost is a player currently in the room

**Result:** `roomInfo` will be emitted back to all in room


### Change Score ###

**Event:** `changeScore`

**Data:** `{"playerName": "Dave2", newScore: 5}`
'
**Requirements:**
* Be joined to a room
* Player is current host
* playerName is a player currently in the room
* newScore is a positive interger

**Result:** `roomInfo` will be emitted back to all in room


### Kick Player ###

**Event:** `kickPlayer`

**Data:** `{"playerName": "Dave2"}`

**Requirements:**
* Be joined to a room
* Player is current host
* playerName is a player currently in the room

**Result:** `roomInfo` will be emitted back to all in room



### Guess Artist ###

**Event:** `guessArtist`

**Data:** `{"playerName": "Dave2"}`

**Requirements:**
* Be joined to a room
* Player is current host
* playerName is a player currently in the room
* Room State is playingGame

**Result:** `roomInfo` will be emitted back to all in room. If guess was correct artist will gain points and `guessed` will be set to true on the incorectly guessed player. If guess was correct points will go to all players and game state will move to artistGuessed. If artist was not guessed, but only one player remains artist will be shown, but no points will be set


### Start Game ###

**Event:** `startGame`

**Data:** `{}`

**Requirements:**
* Be joined to a room
* Player is current host
* More than one player in room
* Category has been set
* Room is in state lobby

**Result:** `roomInfo` will be emitted back to client


### Guess Word ###

**Event:** `guessWord`

**Data:** `{"wasCorrect":true}`

**Requirements:**
* Be joined to a room
* Player is current host
* Room is in state artistGuessed

**Result:** `roomInfo` will be emitted back to client. If artist was correct points will be set  Room state will move to artistGuessed


### New Game ###

**Event:** `newGame`

**Data:** `{}`

**Requirements:**
* Be joined to a room
* Player is current host

**Result:** `roomInfo` will be emitted back to client. Scores and lastArtist will be saved/set


### Disconnect / Quit ###

**Event:** `disconnect`

**Data:** N/A

**Requirements:**


**Result:** `roomInfo` will be emitted back to all left in room. If player was host, another player will be set. Will automaticly trigger if socket.io is dosconnected

