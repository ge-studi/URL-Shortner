const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const urlRoutes = require('./routes/urlRoutes'); // Ensure this points to the right file

const cors = require('cors');


// Load environment variables
dotenv.config();

// Connect to database
connectDB();

const app = express();

app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mount routes
app.use('/api/url', urlRoutes); // Ensure urlRoutes is exported correctly

// Root-level route for short URL redirection
const Url = require('./models/Url');
app.get('/:shortUrl', async (req, res) => {
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

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
