require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

const imagesRouter = require('./routes/images');
const videosRouter = require('./routes/videos');
const historyRouter = require('./routes/history');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use(express.static(path.join(__dirname, '../public')));
app.use('/generated', express.static(path.join(__dirname, '../generated')));

app.use('/api/images', imagesRouter);
app.use('/api/videos', videosRouter);
app.use('/api/history', historyRouter);

app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Gemini Creator running at http://localhost:${PORT}`);
});
