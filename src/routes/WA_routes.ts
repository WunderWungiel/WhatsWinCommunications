import { users } from '../types';
import { startSock } from '../baileys/socket';
import { encryptMessageWithAesKey, messageToBuffer, decryptMessageWithAesKey} from '../cryptoUtils';
import fs from 'fs';

export function setUpWARoutes(app, uploadDisk, uploadMemory) {
    app.post("/WA/startSession", uploadDisk.single('file'), (req, res) => {
        const file = req.file;
        let buffer: Buffer;
        if(file) {
            console.log("there are credentials!")
            buffer = messageToBuffer(req.body.sessionId)
        } else {
            buffer = messageToBuffer(req.body)
        }
        
        let sessionId: string = buffer.subarray(0, 15).toString('utf-8');
        console.log(sessionId)
        
        startSock(sessionId);
        res.send('sock started')
    });

    app.get('/WA/updates', (req, res) => {
        const sessionId = messageToBuffer(req.body).subarray(0, 15).toString('utf-8');
        let user = users.get(sessionId);
        let encryptedMessage = encryptMessageWithAesKey(JSON.stringify(user!.toJSON()), user!.keys.clientKey)
        res.send(encryptedMessage.toString('base64'));
    });

    app.get('/WA/getCreds', (req, res) => {
        const sessionId = messageToBuffer(req.body).toString('utf-8');
        users.get(sessionId)!.credsAvailible = false;
        const filename = sessionId+"-creds.json"
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
        res.setHeader('Content-Type', 'application/octet-stream');
        const stream = fs.createReadStream("./session_stuff/"+filename);
        stream.pipe(res);
    });
    app.post('/WA/sendMessage', (req, res) => {
        const buffer = messageToBuffer(req.body);
        let user = users.get(buffer.subarray(0, 15).toString('utf-8'));
        let jsonBuffer: Buffer = buffer.subarray(15, buffer.length)
        let json = JSON.parse(decryptMessageWithAesKey(jsonBuffer, user!.keys.clientKey))
        user!.socket?.sendMessage(json.number + "@s.whatsapp.net", {text: json.text})
        console.log("message sent!")
        res.send("sent sucsessfully")
    });
    app.post('/WA/sendMedia', uploadMemory.single('file'), (req, res) => {
        const file = req.file
        const buffer = messageToBuffer(req.body.info);
        let user = users.get(buffer.subarray(0, 15).toString('utf-8'));
        let jsonBuffer: Buffer = buffer.subarray(15, buffer.length)
        let json = JSON.parse(decryptMessageWithAesKey(jsonBuffer, user!.keys.clientKey))
    
        if (file) {
            const fileBuffer = file.buffer;
            const mimeType = file.mimetype;
            
            let messageOptions: any = { caption: "" }

            if (mimeType.startsWith('image/')) {
                messageOptions.image = fileBuffer;
            } else if (mimeType.startsWith('video/')) {
                messageOptions.video = fileBuffer;
            } else if (mimeType.startsWith('audio/')) {
                messageOptions.audio = fileBuffer;
            } else {
                messageOptions.document = fileBuffer;
                messageOptions.fileName = file.originalname;
            }

            // Add caption if text property exists and is not empty
            if (json.text) {
                messageOptions.caption = json.text;
            }
    
            user!.socket?.sendMessage(json.number + "@s.whatsapp.net", messageOptions);
        } else {
            res.status(400).send('No file uploaded');
        }
    });
}