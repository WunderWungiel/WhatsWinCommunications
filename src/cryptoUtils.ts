import crypto from 'crypto';


export function generateId(): string {
    return crypto.randomBytes(Math.ceil(15 / 2)).toString('hex').slice(0, 15)
}
export function messageToBuffer(message: Buffer): Buffer {
    return Buffer.from(message.toString('utf-8'), 'base64');
}
export function decryptWithPrivateKey(message: Buffer, privateKey: string): Buffer {
    return crypto.privateDecrypt(
        {
            key: privateKey,
            padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
            oaepHash: 'sha256'
        },
        message
    );
}
export function decryptMessageWithAesKey(message: Buffer, aesKey: Buffer): string {
    const nonce = message.subarray(0, 12);
    const ciphertext = message.subarray(12, message.length - 16);
    const tag = message.subarray(message.length - 16);
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', aesKey, nonce);
    decipher.setAuthTag(tag);

    let decryptedMessage = decipher.update(ciphertext, undefined, 'utf8');
    decryptedMessage += decipher.final('utf8');

    return decryptedMessage
}
export function encryptMessageWithAesKey(message: string, aesKey: Buffer): Buffer {
    const nonce = crypto.randomBytes(12);
    
    const cipher = crypto.createCipheriv('aes-256-gcm', aesKey, nonce);
    let encryptedMessage = cipher.update(message, 'utf8');
    encryptedMessage = Buffer.concat([encryptedMessage, cipher.final()]);

    const tag = cipher.getAuthTag();

    const combinedMessage = Buffer.concat([nonce, encryptedMessage, tag]);

    return combinedMessage
}