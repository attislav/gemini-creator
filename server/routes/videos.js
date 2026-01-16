const express = require('express');
const router = express.Router();
const db = require('../config/database');
const gemini = require('../services/gemini');
const storage = require('../services/storage');

router.post('/generate', async (req, res) => {
  try {
    const { prompt, model = 'veo-3.1', aspectRatio = '9:16', startFrame, endFrame, generateAudio = true, resolution = '720p', duration = 8 } = req.body;

    console.log('[API] POST /api/videos/generate');
    console.log('[API] Model:', model, '| Aspect:', aspectRatio, '| Resolution:', resolution, '| Duration:', duration, 's');
    console.log('[API] Has Start Frame:', !!startFrame, '| Has End Frame:', !!endFrame);

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const operationName = await gemini.startVideoGeneration(
      prompt,
      model,
      aspectRatio,
      startFrame,
      endFrame,
      generateAudio,
      resolution,
      duration
    );

    // Save input settings for "Use again" feature
    const inputSettings = JSON.stringify({
      prompt,
      model,
      aspectRatio,
      resolution,
      duration,
      generateAudio,
      hasStartFrame: !!startFrame,
      hasEndFrame: !!endFrame
    });

    const stmt = db.prepare(`
      INSERT INTO generations (type, prompt, model, aspect_ratio, file_path, mime_type, operation_name, status, input_settings)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      'video',
      prompt,
      model,
      aspectRatio,
      '',
      'video/mp4',
      operationName,
      'processing',
      inputSettings
    );

    const generation = db.prepare('SELECT * FROM generations WHERE id = ?').get(info.lastInsertRowid);

    res.json({
      ...generation,
      message: 'Video generation started. Poll /api/videos/:id/status for updates.'
    });
  } catch (error) {
    console.error('Video generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id/status', async (req, res) => {
  try {
    const generation = db.prepare('SELECT * FROM generations WHERE id = ? AND type = ?').get(req.params.id, 'video');

    if (!generation) {
      return res.status(404).json({ error: 'Video not found' });
    }

    if (generation.status === 'completed' || generation.status === 'failed') {
      return res.json(generation);
    }

    const status = await gemini.pollVideoStatus(generation.operation_name);

    if (status.done) {
      if (status.success) {
        const fileInfo = storage.saveBase64ToFile(status.base64, 'video', status.mimeType);

        db.prepare(`
          UPDATE generations SET file_path = ?, file_size = ?, mime_type = ?, status = ? WHERE id = ?
        `).run(fileInfo.relativePath, fileInfo.fileSize, status.mimeType, 'completed', generation.id);
      } else {
        db.prepare(`
          UPDATE generations SET status = ?, error_message = ? WHERE id = ?
        `).run('failed', status.error, generation.id);
      }

      const updated = db.prepare('SELECT * FROM generations WHERE id = ?').get(generation.id);
      return res.json(updated);
    }

    res.json({
      ...generation,
      status: 'processing'
    });
  } catch (error) {
    console.error('Video status error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', (req, res) => {
  const generation = db.prepare('SELECT * FROM generations WHERE id = ? AND type = ?').get(req.params.id, 'video');

  if (!generation) {
    return res.status(404).json({ error: 'Video not found' });
  }

  res.json(generation);
});

// Manually retry polling for a stuck video
router.post('/:id/retry', async (req, res) => {
  try {
    const generation = db.prepare('SELECT * FROM generations WHERE id = ? AND type = ?').get(req.params.id, 'video');

    if (!generation) {
      return res.status(404).json({ error: 'Video not found' });
    }

    if (!generation.operation_name) {
      return res.status(400).json({ error: 'No operation name found' });
    }

    console.log('[API] Retrying poll for operation:', generation.operation_name);

    const status = await gemini.pollVideoStatus(generation.operation_name);

    if (status.done && status.success) {
      const fileInfo = storage.saveBase64ToFile(status.base64, 'video', status.mimeType);

      db.prepare(`
        UPDATE generations SET file_path = ?, file_size = ?, mime_type = ?, status = ? WHERE id = ?
      `).run(fileInfo.relativePath, fileInfo.fileSize, status.mimeType, 'completed', generation.id);

      const updated = db.prepare('SELECT * FROM generations WHERE id = ?').get(generation.id);
      return res.json({ success: true, message: 'Video saved!', generation: updated });
    } else if (status.done && !status.success) {
      return res.json({ success: false, message: status.error });
    } else {
      return res.json({ success: false, message: 'Video still processing' });
    }
  } catch (error) {
    console.error('Retry poll error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Extend an existing video
router.post('/:id/extend', async (req, res) => {
  try {
    const { model = 'veo-3.1', resolution = '720p' } = req.body;

    const sourceVideo = db.prepare('SELECT * FROM generations WHERE id = ? AND type = ?').get(req.params.id, 'video');

    if (!sourceVideo) {
      return res.status(404).json({ error: 'Source video not found' });
    }

    if (sourceVideo.status !== 'completed') {
      return res.status(400).json({ error: 'Source video is not completed yet' });
    }

    console.log('[API] POST /api/videos/:id/extend');
    console.log('[API] Source Video ID:', req.params.id);
    console.log('[API] Model:', model, '| Resolution:', resolution);

    // Read the source video file as base64
    const sourceVideoBase64 = storage.readFileAsBase64(sourceVideo.file_path);

    const operationName = await gemini.extendVideo(sourceVideoBase64, model, resolution);

    // Create a new generation entry for the extended video
    const stmt = db.prepare(`
      INSERT INTO generations (type, prompt, model, aspect_ratio, file_path, mime_type, operation_name, status, reference_image_path)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      'video',
      `[Extended] ${sourceVideo.prompt}`,
      model,
      sourceVideo.aspect_ratio,
      '',
      'video/mp4',
      operationName,
      'processing',
      sourceVideo.file_path // Store reference to the source video
    );

    const generation = db.prepare('SELECT * FROM generations WHERE id = ?').get(info.lastInsertRowid);

    res.json({
      ...generation,
      sourceVideoId: sourceVideo.id,
      message: 'Video extension started. Poll /api/videos/:id/status for updates.'
    });
  } catch (error) {
    console.error('Video extension error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
