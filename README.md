# WhatsWin Communications

## What's that
basically, it is a standalone server wriiten with TypeScript to communicate with WhatsApp via WebSockets. It uses the WhiskeySockets/Baileys library for it.  
To secure a connection between server and client we use a public keypair, symmetrical aes key and aes-gcm encryption method

## How do i start it up?
### Windows
1) Resolve dependencies:  
Install [Node.Js](https://nodejs.org/en), [yarn](https://classic.yarnpkg.com/lang/en/docs/install/#debian-stable) and git
2) Clone the repo
3) Cd to the repo dir and run:  
```yarn```  
 ```yarn build:run```


The server software that makes WhatsWin possible

WhatsWin: https://github.com/windows8group/WhatsWin
