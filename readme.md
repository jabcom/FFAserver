# API Reference #

# Backround #
FFA communicates using socket.io. New connections will remain unassigned before joining a game, at which point the socket saves the room and player IDs and joins the appropriate socket.io "room"

# Client Listeners #


## Server Info
**Event:** `serverInfo`

**Data:**
```
{version: "0.0.1", salt: "ab78a7071eb525b1e762a65d5be83fcc", name: "TestServer"}
```
**Notes:**
The Salt is important as this is used for hashing the join room request


## Show Error
**Event:** `showError`

**Data:**
```
{message: "Uh oh, this is an error"}
```
**Notes:**
The message should be displayed to the user.


# Client Emitters #


## Get Server Info ##

**Event:** `serverInfo`

**Data:** None

**Requirements:** none

**Result:** Return Data emitted to client `serverInfo`


## Create a new room

**Event:** `newRoom`

**Data:**
```
{playerName: "PlayerOne", passcode: "lemein"}
```
**Requirements:** none

**Result:** server will emit `roomInfo` back to client


## Set Category ##

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


## Add Word List ##

**Event:** `setWordList`

**Data:**
```
{list: ["word1", "word2", "word3"]}
```
**Requirements:**
* Be joined to a room
* Room is in state "addingWords"

**Result:** `roomInfo` will be emitted back to client, with players word list


# Client Examples #

## Creating a new room ##

## Joining a Room ##
