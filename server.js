const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'prayers.json');
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'build')));

function readPrayers() {
  if (!fs.existsSync(DATA_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function writePrayers(prayers) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(prayers, null, 2));
}

app.get('/api/prayers', (req, res) => {
  res.json(readPrayers());
});

app.post('/api/prayers', (req, res) => {
  const prayers = readPrayers();
  const prayer = req.body;
  prayers.unshift(prayer);
  writePrayers(prayers);
  res.status(201).json(prayer);
});

app.put('/api/prayers/:id', (req, res) => {
  const prayers = readPrayers();
  const idx = prayers.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  prayers[idx] = { ...prayers[idx], ...req.body };
  writePrayers(prayers);
  res.json(prayers[idx]);
});

app.delete('/api/prayers/:id', (req, res) => {
  const prayers = readPrayers();
  const filtered = prayers.filter(p => p.id !== req.params.id);
  writePrayers(filtered);
  res.status(204).end();
});

// Serve React for all other routes
app.get('*splat', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
