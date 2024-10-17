import express from 'express';
import multer from 'multer';
import { generateId } from './cryptoUtils';
import { setUpPrivacyRoutes } from './routes/privacy_routes';
import { setUpWARoutes } from './routes/WA_routes';



const app = express();
app.use(express.raw({ type: 'application/octet-stream' }));

const storageMemory = multer.memoryStorage();

// Disk storage with user-defined filenames
const storageDisk = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './session_stuff/');
  },
  filename: (req, file, cb) => {
    const originalName = file.originalname;
    cb(null, originalName);
  }
});
const uploadMemory = multer({ storage: storageMemory });
const uploadDisk = multer({ storage: storageDisk });

app.get('/generateSessionId', (req, res) => {
	res.send(generateId())
});

setUpPrivacyRoutes(app);
setUpWARoutes(app, uploadDisk, uploadMemory);



app.listen(5000, () => {
    console.log('Server is running on http://127.0.0.1:5000');
});
