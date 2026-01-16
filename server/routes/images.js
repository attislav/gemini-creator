const express = require('express');
const router = express.Router();
const db = require('../config/database');
const gemini = require('../services/gemini');
const storage = require('../services/storage');

router.post('/generate', async (req, res) => {
  try {
    const { prompt, model = 'nano-banana', aspectRatio = '16:9', referenceImages = [], resolution = null, referenceImageIds = [] } = req.body;

    console.log('[API] POST /api/images/generate');
    console.log('[API] Model:', model, '| Aspect:', aspectRatio, '| Resolution:', resolution);
    console.log('[API] Reference Images:', referenceImages?.length || 0, '| From History:', referenceImageIds?.length || 0);

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const result = await gemini.generateImage(prompt, model, aspectRatio, referenceImages, resolution);

    const fileInfo = storage.saveBase64ToFile(result.base64, 'image', result.mimeType);

    // Save input settings for "Use again" feature (including history IDs)
    const inputSettings = JSON.stringify({
      prompt,
      model,
      aspectRatio,
      resolution,
      referenceImageCount: referenceImages?.length || 0,
      referenceImageIds: referenceImageIds || []
    });

    const stmt = db.prepare(`
      INSERT INTO generations (type, prompt, model, aspect_ratio, file_path, mime_type, file_size, status, input_settings)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      'image',
      prompt,
      model,
      aspectRatio,
      fileInfo.relativePath,
      result.mimeType,
      fileInfo.fileSize,
      'completed',
      inputSettings
    );

    const generation = db.prepare('SELECT * FROM generations WHERE id = ?').get(info.lastInsertRowid);

    res.json(generation);
  } catch (error) {
    console.error('Image generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', (req, res) => {
  const generation = db.prepare('SELECT * FROM generations WHERE id = ? AND type = ?').get(req.params.id, 'image');

  if (!generation) {
    return res.status(404).json({ error: 'Image not found' });
  }

  res.json(generation);
});

module.exports = router;
