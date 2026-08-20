const express = require('express');
const path = require('path');
const cors = require('cors');

const infoRouter = require('./routes/info');
const downloadRouter = require('./routes/download');
const filesRouter = require('./routes/files');
const eventsRouter = require('./routes/events');

const app = express();
const PORT = parseInt(process.env.PORT || '8484', 10);

app.use(cors());
app.use(express.json());

// Serve frontend static files
const frontendPath = path.join(__dirname, '../../frontend');
app.use(express.static(frontendPath));

// API routes
app.use('/api/info', infoRouter);
app.use('/api/download', downloadRouter);
app.use('/api/files', filesRouter);
app.use('/api/events', eventsRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Fallback — serve the SPA
app.get('*', (_req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[flux-dl] Server running on port ${PORT}`);
  console.log(`[flux-dl] Downloads directory: ${process.env.DOWNLOADS_DIR || './downloads'}`);
});

module.exports = app;
