const express = require('express');
const path = require('path');
const fs = require('fs');
const { DOWNLOADS_DIR } = require('../services/ytdlp');
const queue = require('../services/queue');

const router = express.Router();

// GET /api/files — list all completed files on disk
router.get('/', (_req, res) => {
  try {
    if (!fs.existsSync(DOWNLOADS_DIR)) {
      return res.json([]);
    }

    const files = fs.readdirSync(DOWNLOADS_DIR)
      .filter((name) => !name.startsWith('.'))
      .map((name) => {
        const filePath = path.join(DOWNLOADS_DIR, name);
        const stat = fs.statSync(filePath);
        return {
          name,
          size: stat.size,
          modifiedAt: stat.mtime.toISOString(),
          downloadUrl: `/api/files/${encodeURIComponent(name)}`,
        };
      })
      .sort((a, b) => new Date(b.modifiedAt) - new Date(a.modifiedAt));

    return res.json(files);
  } catch (err) {
    console.error('[files] Error listing files:', err.message);
    return res.status(500).json({ error: 'Erro ao listar arquivos.' });
  }
});

// GET /api/files/:filename — serve the file for local download
router.get('/:filename', (req, res) => {
  const filename = decodeURIComponent(req.params.filename);

  // Prevent path traversal
  const filePath = path.resolve(DOWNLOADS_DIR, filename);
  if (!filePath.startsWith(path.resolve(DOWNLOADS_DIR))) {
    return res.status(400).json({ error: 'Caminho inválido.' });
  }

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Arquivo não encontrado.' });
  }

  res.download(filePath, filename);
});

// DELETE /api/files/:filename — delete a file from disk
router.delete('/:filename', (req, res) => {
  const filename = decodeURIComponent(req.params.filename);
  const filePath = path.resolve(DOWNLOADS_DIR, filename);

  if (!filePath.startsWith(path.resolve(DOWNLOADS_DIR))) {
    return res.status(400).json({ error: 'Caminho inválido.' });
  }

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Arquivo não encontrado.' });
  }

  try {
    fs.unlinkSync(filePath);
    return res.status(204).send();
  } catch (err) {
    return res.status(500).json({ error: `Erro ao remover o arquivo: ${err.message}` });
  }
});

module.exports = router;
