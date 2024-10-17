import crypto from 'crypto';
import { decryptWithPrivateKey, decryptMessageWithAesKey, encryptMessageWithAesKey, messageToBuffer} from '../cryptoUtils';
import { User, users } from '../types';

export function setUpPrivacyRoutes(app) {
    app.get('/privacy/getPublicKey', (req, res) => {
        const id = messageToBuffer(req.body).toString('utf-8')
        console.log(id)
        let user: User = new User();
        const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: {
                type: 'spki',
                format: 'pem'
            },
            privateKeyEncoding: {
                type: 'pkcs8',
                format: 'pem'
            }
        });
        user.keys.publicKey = publicKey;
        user.keys.privateKey = privateKey;
        users.set(id, user);
        res.send(publicKey);
    });
    
    app.post('/privacy/sendSymmetricalKey', (req, res) => {
        let buffer = messageToBuffer(req.body)
    
        let sessionId: string = buffer.subarray(0, 15).toString('utf-8');
        let message: Buffer = buffer.subarray(15, buffer.length)
        let user = users.get(sessionId);
        console.log(sessionId, message)
        
        const decryptedMessage = decryptWithPrivateKey(message, user!.keys.privateKey)
        user!.keys.clientKey = decryptedMessage;
        res.send({message: 'key decrypted'})
    });
    
    app.post('/privacy/sendEncryptedMessage', (req, res) => {
        const buffer = messageToBuffer(req.body)
    
        let sessionId: string = buffer.subarray(0, 15).toString('utf-8');
        let message: Buffer = buffer.subarray(15, buffer.length)
        let user = users.get(sessionId);
    
        let decryptedMessage: string = decryptMessageWithAesKey(message, user!.keys.clientKey)
        console.log("Дешифрованное сообщение:", decryptedMessage);
        res.send('dectypted sucsessfully!')
    });
    app.get('/privacy/getEncryptedMessage', (req, res) => {
        const id = messageToBuffer(req.body).toString('utf-8')
        let user = users.get(id);
    
        let encryptedMessage = encryptMessageWithAesKey("Hello from server!", user!.keys.clientKey)
        res.send(encryptedMessage.toString('base64'));
    });
}