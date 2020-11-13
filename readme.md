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

**Data:** None

**Requirements:** none

**Result:** Return Data emitted to client `serverInfo`


### Create a new room ###

**Event:** `newRoom`

**Data:**
```
{playerName: "PlayerOne", passcode: "lemein"}
```
**Requirements:** none

**Result:** server will emit `roomInfo` back to client


### Set Category ###

**Event:** `setCategory`

**Data:**
```
{category: "MyCategory"}
```
**Requirements:**
* Be joined to a room
* Be host of the room
* Room is in state "lobby"

**Result:** If successful `serverInfo` will be emitted to all in room. If player is not host will send message to `showError`


### Add Word List ###

**Event:** `setWordList`

**Data:**
```
{list: ["word1", "word2", "word3"]}
```
**Requirements:**
* Be joined to a room
* Room is in state "addingWords"

**Result:** `roomInfo` will be emitted back to client, with players word list


### StartGame ###

**Event:** `startGame`

**Data:**

None
**Requirements:**
* Be joined to a room
* Player is host
* Room is in state "addingWords"
* All Players have entered min number of words

**Result:** `roomInfo` will be emitted back to client, with players word list


# Client Examples #

## Creating a new room ##

## Joining a Room ##
