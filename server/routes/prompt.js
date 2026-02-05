const express = require('express');
const router = express.Router();
const { enhancePrompt } = require('../services/promptEnhancer');

router.post('/enhance', async (req, res) => {
  try {
    const { prompt, type, image } = req.body;

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ error: 'Prompt ist erforderlich' });
    }

    if (type && !['image', 'video'].includes(type)) {
      return res.status(400).json({ error: 'Typ muss "image" oder "video" sein' });
    }

    const enhancedPrompt = await enhancePrompt(prompt.trim(), type || 'image', image || null);

    res.json({
      original: prompt,
      enhanced: enhancedPrompt
    });
  } catch (error) {
    console.error('Prompt enhancement error:', error);
    res.status(500).json({ error: error.message || 'Fehler bei der Prompt-Verbesserung' });
  }
});

module.exports = router;
