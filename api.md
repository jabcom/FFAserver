# API Reference #

# Backround #
FFA communicates using socket.io. New connections will remain unassigned before joining a game, at which point the socket saves the room and player IDs and joins the appropriate socket.io "room"

# Client Listeners #
## Server Info
Event `serverInfo`

Data:
```json
{version: "0.0.1",
salt: "ab78a7071eb525b1e762a65d5be83fcc",
name: "TetServer"}
```
Notes:
The Salt is important as this is used for hashing the join room request

# Client Emitters #
## Get Server info
Event: `serverInfo`

Data: None

Requirements: none

Result: Data emitted to client `serverInfo`
# Client Examples #

## Creating a new room ##

## Joining a Room ##
