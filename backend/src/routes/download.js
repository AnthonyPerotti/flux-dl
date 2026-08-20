const express = require('express');
const queue = require('../services/queue');

const router = express.Router();

// POST /api/download — enqueue a new download
router.post('/', (req, res) => {
  const { url, title, thumbnail, mode, formatSpec, audioQuality } = req.body;

  if (!url || typeof url !== 'string' || !url.trim()) {
    return res.status(400).json({ error: 'A URL é obrigatória.' });
  }

  if (!mode || !['video', 'audio'].includes(mode)) {
    return res.status(400).json({ error: "O campo 'mode' deve ser 'video' ou 'audio'." });
  }

  const job = queue.add({
    url: url.trim(),
    title: title || url.trim(),
    thumbnail: thumbnail || null,
    mode,
    formatSpec: formatSpec || 'bestvideo+bestaudio/best',
    audioQuality: audioQuality || '0',
  });

  return res.status(201).json(job);
});

// GET /api/download — list all jobs
router.get('/', (_req, res) => {
  return res.json(queue.getAll());
});

// DELETE /api/download/:id — remove a job from history
router.delete('/:id', (req, res) => {
  const job = queue.get(req.params.id);
  if (!job) {
    return res.status(404).json({ error: 'Job não encontrado.' });
  }
  if (job.status === 'downloading') {
    return res.status(409).json({ error: 'Não é possível remover um download em andamento.' });
  }
  queue.remove(req.params.id);
  return res.status(204).send();
});

module.exports = router;
