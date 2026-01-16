const express = require('express');
const router = express.Router();
const path = require('path');
const db = require('../config/database');
const storage = require('../services/storage');

router.get('/', (req, res) => {
  const { page = 1, limit = 20, type } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let whereClause = '';
  const params = [];

  if (type && (type === 'image' || type === 'video')) {
    whereClause = 'WHERE type = ?';
    params.push(type);
  }

  const countQuery = `SELECT COUNT(*) as total FROM generations ${whereClause}`;
  const { total } = db.prepare(countQuery).get(...params);

  const query = `
    SELECT * FROM generations
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `;

  const items = db.prepare(query).all(...params, parseInt(limit), offset);

  res.json({
    items,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / parseInt(limit))
    }
  });
});

// Get single item by ID
router.get('/:id', (req, res) => {
  const generation = db.prepare('SELECT * FROM generations WHERE id = ?').get(req.params.id);

  if (!generation) {
    return res.status(404).json({ error: 'Generation not found' });
  }

  res.json(generation);
});

router.get('/:id/download', (req, res) => {
  const generation = db.prepare('SELECT * FROM generations WHERE id = ?').get(req.params.id);

  if (!generation) {
    return res.status(404).json({ error: 'Generation not found' });
  }

  if (!generation.file_path) {
    return res.status(404).json({ error: 'File not available' });
  }

  const absolutePath = storage.getAbsolutePath(generation.file_path);
  const filename = path.basename(generation.file_path);

  res.download(absolutePath, filename);
});

router.delete('/:id', (req, res) => {
  const generation = db.prepare('SELECT * FROM generations WHERE id = ?').get(req.params.id);

  if (!generation) {
    return res.status(404).json({ error: 'Generation not found' });
  }

  if (generation.file_path) {
    storage.deleteFile(generation.file_path);
  }

  db.prepare('DELETE FROM generations WHERE id = ?').run(req.params.id);

  res.json({ success: true, message: 'Generation deleted' });
});

module.exports = router;
