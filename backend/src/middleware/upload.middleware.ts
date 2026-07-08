import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Request } from 'express';
import fs from 'fs';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const imageFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (jpg, jpeg, png, webp)'));
  }
};

const csvFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowed = ['.csv', '.xlsx', '.xls'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only CSV/Excel files are allowed'));
  }
};

const cloudinaryStorage = (folder: string) =>
  new CloudinaryStorage({
    cloudinary,
    params: async () => ({
      folder: `school-election/${folder}`,
      public_id: uuidv4(),
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    }),
  });

export const uploadPhoto = multer({
  storage: cloudinaryStorage('photos'),
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

export const uploadLogo = multer({
  storage: cloudinaryStorage('logos'),
  fileFilter: imageFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
});

// CSV import stays local — consumed and deleted within the same request, no persistence needed
const createLocalStorage = (dest: string) => {
  const uploadPath = path.join(process.cwd(), 'uploads', dest);
  if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
  }
  return multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadPath),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${uuidv4()}${ext}`);
    },
  });
};

export const uploadCSV = multer({
  storage: createLocalStorage('imports'),
  fileFilter: csvFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});