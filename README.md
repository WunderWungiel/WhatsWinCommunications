# WhatsWin Communications

## What's that
Basically, it is a standalone server wriiten with TypeScript to communicate with WhatsApp via WebSockets. It uses the WhiskeySockets/Baileys library for it. To secure a connection between server and client we use a public keypair, symmetrical aes key and aes-gcm encryption method

## Tutorial

### Standard method
1) Resolve dependencies:
Install [Node.js](https://nodejs.org/en), [yarn](https://classic.yarnpkg.com/lang/en/docs/install/) and `git`
2) Clone the repo
3) Cd to the repo dir and run:

```yarn```
```yarn build:run```

4) Server will listen on port 5000

### Docker
1) Clone the repo
2) Execute:

```
docker compose pull
docker compose up -d
```

3) Server will listen on port 8080, customize in `compose.yaml`

The server software that makes WhatsWin possible

WhatsWin: https://github.com/windows8group/WhatsWin
