# Secure P2P Chat

This is another one of my random projects that I threw together in a random morning/afternoon

## QuickStart

### First Run

`npm run all`

### After First Run

`npm run start`

### Commands

`/listen [port]` -- Host a chat. Port is optional

`/connect HOST:PORT` -- Connect to someone else's chat session

`/su USERNAME` -- Change username from your session/computer username to something else

#### Other Commands

`/import PATH` -- Path (local or remote) to a JavaScript file to be EVAL'd locally

`/exit` -- Quit

`/motd` -- Echo the local MOTD (eventually, this will go to the remote as well)

`/me` -- Whisper to yourself (eventually, this will go to the remote as well)

`/error` -- Output the stacktrace of the last error to occur in the application
