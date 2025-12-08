const express = require('express');
const router = express.Router();
const cryptoService = require('../services/cryptoService');

router.get('/top', async (req, res) => {
  try {
    const topPrices = await cryptoService.getTopPrices();
    res.json(topPrices);
  } catch (error) {
    console.error('Error fetching top prices:', error.message);
    res.status(500).json({ error: 'Failed to fetch prices' });
  }
});

router.get('/list', async (req, res) => {
  try {
    const allPrices = await cryptoService.getAllPrices();
    res.json(allPrices);
  } catch (error) {
    console.error('Error fetching price list:', error.message);
    res.status(500).json({ error: 'Failed to fetch prices' });
  }
});

module.exports = router;
