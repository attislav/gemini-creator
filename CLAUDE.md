# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies
npm install

# Start server (production)
npm start

# Start server with auto-reload (development)
npm run dev
```

Server runs at http://localhost:3222

## Architecture

### Overview

Web app for AI image/video generation using Google Gemini API. Plain HTML/CSS/JS frontend, Node.js/Express backend, SQLite database.

### Backend (`server/`)

- **index.js** - Express server setup, static file serving, route mounting
- **config/database.js** - SQLite initialization with better-sqlite3, creates `generations` table
- **services/gemini.js** - Gemini API client with model mappings:
  - Image: `nano-banana` → `gemini-2.5-flash-image`, `nano-banana-pro` → `gemini-3-pro-image-preview`
  - Video: `veo-3.1` → `veo-3.1-generate-preview`, `veo-3.1-fast` → `veo-3.1-fast-generate-preview`
- **services/storage.js** - File operations (save base64 to file, read file as base64, delete)
- **routes/images.js** - `POST /api/images/generate` - synchronous image generation
- **routes/videos.js** - `POST /api/videos/generate` (async start), `GET /api/videos/:id/status` (polling), `POST /api/videos/:id/extend`
- **routes/history.js** - CRUD for generations with pagination

### Frontend (`public/`)

- **index.html** - Single page with 3 tabs (Bildgenerierung, Videogenerierung, History)
- **js/api.js** - Fetch wrapper for all API calls
- **js/imageGenerator.js** - Image form handling, batch generation (1-4 images), reference image uploads
- **js/videoGenerator.js** - Video form, start/end frame uploads, polling logic
- **js/history.js** - History grid, filtering, pagination
- **js/app.js** - Tab navigation, modal handling, zoom controls, history picker

### Data Flow

1. **Image Generation**: Frontend → `/api/images/generate` → gemini.generateImage() → storage.saveBase64ToFile() → DB insert → response
2. **Video Generation**: Frontend → `/api/videos/generate` → gemini.startVideoGeneration() → returns operation name → Frontend polls `/api/videos/:id/status` → gemini.pollVideoStatus() → on completion: save file + update DB

### Key API Patterns

- Image API uses `generateContent` endpoint (synchronous)
- Video API uses `predictLongRunning` endpoint (async with polling)
- Video frames: start frame in `instance.image`, end frame in `parameters.lastFrame` (both need `bytesBase64Encoded` + `mimeType`)
- Video extension uses `source` parameter with the existing video

## Configuration

Requires `.env` with:
```
GEMINI_API_KEY=your_api_key_here
```

Get API key from https://aistudio.google.com/
