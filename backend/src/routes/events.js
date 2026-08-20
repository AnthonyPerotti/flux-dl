const express = require('express');
const queue = require('../services/queue');

const router = express.Router();

// Track all active SSE clients
const clients = new Set();

// Listen to queue updates and broadcast to all connected clients
queue.on('update', (job) => {
  const payload = `data: ${JSON.stringify(job)}\n\n`;
  for (const client of clients) {
    client.write(payload);
  }
});

// GET /api/events — SSE stream
router.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // disable Nginx buffering if behind a proxy
  res.flushHeaders();

  // Send current queue state immediately on connect
  const snapshot = queue.getAll();
  for (const job of snapshot) {
    res.write(`data: ${JSON.stringify(job)}\n\n`);
  }

  // Keep connection alive with a heartbeat
  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 25000);

  clients.add(res);

  req.on('close', () => {
    clearInterval(heartbeat);
    clients.delete(res);
  });
});

module.exports = router;
