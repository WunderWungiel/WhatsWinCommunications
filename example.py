import requests
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives import serialization, hashes
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
import os
import base64
import time
import json
import signal
import sys
sessionId = ""
def handle_signal(signal, frame):
    response = requests.post('http://localhost:5000/WA/closeSession', data=base64.b64encode(sessionId.encode('utf-8')), files=None, headers=headers)
    sys.exit(0)

signal.signal(signal.SIGINT, handle_signal)
signal.signal(signal.SIGTERM, handle_signal)
def decrypt_message_with_aes_key(base64_encrypted_message: str, aes_key: bytes) -> str:
    # Декодирование base64 сообщения
    encrypted_message = base64.b64decode(base64_encrypted_message)

    # Извлечение nonce, ciphertext и tag
    nonce = encrypted_message[:12]
    tag = encrypted_message[-16:]
    ciphertext = encrypted_message[12:-16]

    # Расшифровка сообщения
    cipher = Cipher(algorithms.AES(aes_key), modes.GCM(nonce, tag), backend=default_backend())
    decryptor = cipher.decryptor()
    decrypted_message = decryptor.update(ciphertext) + decryptor.finalize()

    return decrypted_message.decode('utf-8')


headers = {'Content-Type': 'application/octet-stream'}

response = requests.get('http://localhost:5000/generateSessionId')
sessionId = response.text
times = 0

# 1. Получение публичного ключа из API
response = requests.get('http://localhost:5000/privacy/getPublicKey', data=base64.b64encode(sessionId.encode('utf-8')), headers=headers)
public_key_pem = response.content
print("Key recieved:", public_key_pem)
# Загрузка публичного ключа
public_key = serialization.load_pem_public_key(public_key_pem)

# 2. Генерация AES ключа
aes_key = os.urandom(32)  # 256-битный ключ

# 3. Шифрование AES ключа с помощью публичного ключа
encrypted_aes_key = public_key.encrypt(
    aes_key,
    padding.OAEP(
        mgf=padding.MGF1(algorithm=hashes.SHA256()),
        algorithm=hashes.SHA256(),
        label=None
    )
)

# Отправка зашифрованного AES ключа на сервер
response = requests.post('http://localhost:5000/privacy/sendSymmetricalKey', data=base64.b64encode(sessionId.encode('utf-8') + encrypted_aes_key), headers=headers)
print(response.text)

path = f"./python-creds.json"
payload = {"sessionId": base64.b64encode(sessionId.encode('utf-8'))}
if os.path.exists(path):
    # Open the credentials file in binary mode
    with open(path, 'rb') as f:
        # Define the files dictionary
        files = {'file': (f'{sessionId}-creds.json', f, 'application/json')}
        # Send the POST request with the file and JSON payload
        response = requests.post("http://localhost:5000/WA/openSession", files=files, data=payload)
else:
    print("file not found")
    response = requests.post('http://localhost:5000/WA/openSession', data=base64.b64encode(sessionId.encode('utf-8')), files=None, headers=headers)

time.sleep(2)
while True:
    response = requests.get('http://localhost:5000/WA/updates', data=base64.b64encode(sessionId.encode('utf-8')), headers=headers)
    jsonData = decrypt_message_with_aes_key(response.text, aes_key)
    print(jsonData)
    data = json.loads(jsonData)
    if "connection" in data and data["connection"] == "opened" and times == 0 and os.path.exists(path):
        times+=1
        jsonMSG = {
            "number": "replace with actual number",
            "text": "Сообщение от апи"
        }
        messageStr = json.dumps(jsonMSG).encode('utf-8')
        print(messageStr)
        nonce = os.urandom(12)
        aesgcm = AESGCM(aes_key)
        ciphertext = aesgcm.encrypt(nonce, messageStr, None)
        boom_encrypted_message = nonce + ciphertext

        response = requests.post('http://localhost:5000/WA/sendMessage', data=base64.b64encode(sessionId.encode('utf-8') + boom_encrypted_message), headers=headers)
        jsonMSG = {
            "user": True, #False if group profile picture
            "id": "place number pr group id here",
            "highRes": True #image or preview
        }
        response = requests.get('http://localhost:5000/WA/getProfilePicture', data=base64.b64encode(sessionId.encode('utf-8') + json.dumps(jsonMSG).encode('utf-8')), headers=headers)
        print("Get the PP here:", response.text)

    if "credsAvailible" in data and data["credsAvailible"] == True:
        response = requests.get('http://localhost:5000/WA/getCreds', data=base64.b64encode(sessionId.encode('utf-8')), headers=headers)
        if response.status_code == 200:
            filename = "python-creds.json"
            with open(filename, 'wb') as f:
                f.write(response.content)            
            print(f'File downloaded successfully as {filename}')
        else:
            print(f'Failed to download file. Status code: {response.status_code}')
    if 'updates' in data and data['updates'] and times == 1:
        # Check if '0' element exists and has the right type
        if '0' in data['updates'] and data['updates']['0']['type'] == 'messages.upsert':
            # Extract and load the content
            updates_0_content_str = data['updates']['0']['content']
            updates_0_content = json.loads(updates_0_content_str)
            jsonMSG = {
                "number": "<your number here>",
                "text": "Quoted message",
                "quoted": updates_0_content.get('message', {})
            }
            messageStr = json.dumps(jsonMSG).encode('utf-8')
            nonce = os.urandom(12)
            aesgcm = AESGCM(aes_key)
            ciphertext = aesgcm.encrypt(nonce, messageStr, None)
            boom_encrypted_message = nonce + ciphertext

            response = requests.post('http://localhost:5000/WA/sendMessage', data=base64.b64encode(sessionId.encode('utf-8') + boom_encrypted_message), headers=headers)
            times+=1
    time.sleep(10) 
