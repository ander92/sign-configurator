# Illuminated Signs App

This workspace contains a modern web application for a custom illuminated signs company.

## Architecture

- `frontend/` - Angular application with Tailwind CSS, upload flow, and configurator preview.
- `backend/` - Node.js + Express API for image upload, AI generation, order capture, and Cloudinary integration.

## Frontend Features

- Homepage with app overview
- Upload storefront photo
- Interactive sign configurator with position, size, font, and color controls
- Real-time preview panel

## Backend Features

- Express server scaffold
- API routes for upload, preview export, and order submission
- Cloudinary utility stub for future image storage

## Getting Started

1. Install frontend dependencies:
   ```bash
   cd "d:/Andrei proj/frontend"
   npm install
   npm start
   ```
2. Install backend dependencies:
   ```bash
   cd "d:/Andrei proj/backend"
   npm install
   npm run dev
   ```

## Deployment Notes

- The frontend is configured for production builds with `environment.prod.ts` and uses a relative `/api` path so it can run on Vercel with an API function or behind a reverse proxy.
- If you deploy on Vercel, set `OPENAI_API_KEY` in the project environment variables to enable image generation.
- Local development uses `frontend/proxy.conf.json` so `npm start` will proxy `/api` calls to `http://localhost:3000`.
