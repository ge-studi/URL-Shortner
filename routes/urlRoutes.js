const express = require('express');
const router = express.Router();
const shortid = require('shortid');
const Url = require('../models/Url');
const QRCode = require('qrcode'); // Import QR code library

// @route POST /api/url/shorten
// @desc Shorten a URL and generate a QR code
router.post('/shorten', async (req, res) => {
  const { originalUrl, expirationDays } = req.body;

  if (!originalUrl) {
    return res.status(400).json({ error: 'Original URL is required' });
  }

  const base = process.env.BASE_URL;
  const shortUrl = shortid.generate();

  const urlData = {
    originalUrl,
    shortUrl,
    expiresAt: expirationDays
      ? new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000)
      : null,
  };

  try {
    // Save URL to database
    const url = new Url(urlData);
    await url.save();

    // Generate QR code for the shortened URL
    const qrCode = await QRCode.toDataURL(`${base}/${shortUrl}`);

    res.status(201).json({
      shortUrl: `${base}/${shortUrl}`,
      qrCode, // Return the QR code as a base64 string
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route GET /:shortUrl
// @desc Redirect to original URL
router.get('/:shortUrl', async (req, res) => {
  const { shortUrl } = req.params;

  try {
    const url = await Url.findOne({ shortUrl });

    if (!url) {
      return res.status(404).json({ error: 'URL not found' });
    }

    if (url.expiresAt && url.expiresAt < Date.now()) {
      return res.status(410).json({ error: 'URL has expired' });
    }

    url.clicks++;
    await url.save();
    res.redirect(url.originalUrl);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route GET /api/url/stats/:shortUrl
// @desc Get URL stats
router.get('/stats/:shortUrl', async (req, res) => {
  const { shortUrl } = req.params;

  try {
    const url = await Url.findOne({ shortUrl });

    if (!url) {
      return res.status(404).json({ error: 'URL not found' });
    }

    res.json({
      originalUrl: url.originalUrl,
      shortUrl: `${process.env.BASE_URL}/${url.shortUrl}`,
      clicks: url.clicks,
      expiresAt: url.expiresAt,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
