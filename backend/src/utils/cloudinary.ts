import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export async function uploadToCloudinary(buffer: Buffer, filename: string): Promise<UploadApiResponse> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: 'illuminated-signs' },
      (error, result) => {
        if (error) {
          return reject(error);
        }
        resolve(result as UploadApiResponse);
      }
    );

    uploadStream.end(buffer);
  });
}
