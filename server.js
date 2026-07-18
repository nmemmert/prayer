const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'prayers.json');
const PORT = process.env.PORT || 4000;

// Ensure data directory exists and is writable on startup
try {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.accessSync(DATA_DIR, fs.constants.W_OK);
  console.log(`Data directory ready: ${DATA_DIR}`);
} catch (err) {
  console.error(`WARNING: Data directory not writable: ${DATA_DIR} — ${err.message}`);
  // Attempt chmod in case it's a simple permission gap
  try { fs.chmodSync(DATA_DIR, 0o755); } catch {}
}

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

app.get('/api/health', (req, res) => {
  let writable = false;
  try { fs.accessSync(DATA_DIR, fs.constants.W_OK); writable = true; } catch {}
  res.json({ ok: writable, dataDir: DATA_DIR, dataFile: DATA_FILE });
});

app.get('/api/prayers', (req, res) => {
  res.json(readPrayers());
});

app.post('/api/prayers', (req, res) => {
  try {
    const prayers = readPrayers();
    const prayer = req.body;
    prayers.unshift(prayer);
    writePrayers(prayers);
    res.status(201).json(prayer);
  } catch (err) {
    console.error('Write failed:', err.message);
    res.status(500).json({ error: 'Could not save prayer. Check data directory permissions.' });
  }
});

app.put('/api/prayers/:id', (req, res) => {
  try {
    const prayers = readPrayers();
    const idx = prayers.findIndex(p => p.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    prayers[idx] = { ...prayers[idx], ...req.body };
    writePrayers(prayers);
    res.json(prayers[idx]);
  } catch (err) {
    console.error('Write failed:', err.message);
    res.status(500).json({ error: 'Could not save prayer. Check data directory permissions.' });
  }
});

app.delete('/api/prayers/:id', (req, res) => {
  try {
    const prayers = readPrayers();
    const filtered = prayers.filter(p => p.id !== req.params.id);
    writePrayers(filtered);
    res.status(204).end();
  } catch (err) {
    console.error('Write failed:', err.message);
    res.status(500).json({ error: 'Could not delete prayer. Check data directory permissions.' });
  }
});

// Serve React for all other routes
app.get('*splat', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}, data: ${DATA_FILE}`));
