# Secure P2P Chat

This is another one of my random projects that I threw together in a random morning/afternoon

## QuickStart

### First Run

`npm run all`

### After First Run

`npm run start`

### Instructions

`Specify a Port:` -- Enter port number to listen for connections; default is a random port

`Identify As:` -- Your username for this chat session

### Connecting

Determine who establishes the connection. If you establish the connection, get the other user's IP Address and Port. Otherwise, sit and wait for their connection.

To connect to the other user, instead of let the other user connect to you:

`Remote Peer:` -- `host:port` of the other member you're chatting with

**DO NOT HIT ENTER IF YOU'RE WAITING FOR A CONNECTION. JUST WAIT**

## Usage

There are several scripts within the `package.json` that makes things easy to use.

Essentially, to run the app from the get go, clone the repository and then type in `npm run all` in the console and you should be good to go!

## Establishing Connection

When you first run the app, it'll prompt you for a port to utilize. If you ignore this step, it'll randomly generate a port to listen.

Afterwards, you'll be asked to specify a username. If you choose not to, you'll appear as "remote" to the other user.

Once you're done, you'll be prompted to enter a "Remote Peer". You'll either need to specify the host:port of the other user you want to chat with, or you can sit and wait and let the other person specify your host:port

Once connection is established, regardless of whether or not you specified host:port or the other user did, you'll be prompted with `<you> |`. At this point, the two of you are chatting!

To close the connection, simple use `Ctrl+C` to kill the application. The other user's app will close as well when you close the connection.

## Options

If you'd like a couple more features, you can do the following:

First, build the app: `npm run build`

Afterwards, you can run the app with options:

`node ./app/main.js [--raw] [--temp]`

**`--raw`**: This bypass decrypt when a message comes in, so you can see the raw, encrypted version of the message the other user sent

**`--temp`**: Normally, when you run the setup, this app will create a new OpenSSL RSA Keypair and store it in a `certs` directory within the path of the project. However, specifying `--temp` will automatically generate a new RSA keypair any time you run the app, essentially forcing the private key to only ever exist in memory, for a bit more security.
