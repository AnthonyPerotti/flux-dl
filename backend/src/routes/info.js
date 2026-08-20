const express = require('express');
const { getInfo } = require('../services/ytdlp');

const router = express.Router();

router.post('/', async (req, res) => {
  const { url } = req.body;

  if (!url || typeof url !== 'string' || !url.trim()) {
    return res.status(400).json({ error: 'A URL é obrigatória.' });
  }

  try {
    const info = await getInfo(url.trim());
    return res.json(info);
  } catch (err) {
    console.error('[info] Error:', err.message);
    return res.status(422).json({
      error: 'Não foi possível obter informações do link. Verifique a URL e tente novamente.',
      detail: err.message,
    });
  }
});

module.exports = router;
