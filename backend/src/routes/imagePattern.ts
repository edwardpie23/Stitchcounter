import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth';
import {
  convertImage,
  saveImagePattern,
  getImagePatterns,
  getImagePattern,
  deleteImagePattern,
} from '../controllers/imagePattern';

export const imagePatternRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    if (['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

imagePatternRouter.use(authenticate);

imagePatternRouter.post('/convert', upload.single('image'), convertImage);
imagePatternRouter.get('/', getImagePatterns);
imagePatternRouter.post('/', saveImagePattern);
imagePatternRouter.get('/:id', getImagePattern);
imagePatternRouter.delete('/:id', deleteImagePattern);
