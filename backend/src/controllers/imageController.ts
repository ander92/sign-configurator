import { Request, Response } from 'express';
import { uploadToCloudinary } from '../utils/cloudinary';

export async function uploadImage(req: Request, res: Response): Promise<Response> {
  if (!req.file) {
    return res.status(400).json({ error: 'Image file is required.' });
  }

  try {
    const result = await uploadToCloudinary(req.file.buffer, req.file.originalname);
    return res.json({ success: true, url: result.secure_url, publicId: result.public_id });
  } catch (error) {
    console.error('Upload error', error);
    return res.status(500).json({ error: 'Upload failed.' });
  }
}
