const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  AlignmentType, BorderStyle, ShadingType, TableRow, TableCell,
  Table, WidthType, PageBreak, Header, Footer, PageNumber,
  NumberFormat,
} = require('docx');

const app = express();
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'prayers.json');
const PORT = process.env.PORT || 4000;

try {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.accessSync(DATA_DIR, fs.constants.W_OK);
  console.log(`Data directory ready: ${DATA_DIR}`);
} catch (err) {
  console.error(`WARNING: Data directory not writable: ${DATA_DIR} — ${err.message}`);
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

function fmtDate(iso) {
  return iso ? new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '';
}

function prayerToSection(prayer, index) {
  const paras = [];

  // Prayer number + person
  const titleRuns = [
    new TextRun({ text: `${index + 1}. `, bold: true, size: 24, color: '4B6FA8' }),
  ];
  if (prayer.person) {
    titleRuns.push(new TextRun({ text: prayer.person, bold: true, size: 24, color: '4B6FA8' }));
  }
  paras.push(new Paragraph({ children: titleRuns, spacing: { before: 240, after: 60 } }));

  // Meta: date + tags
  const metaParts = [`Added ${fmtDate(prayer.createdAt)}`];
  if (prayer.tags && prayer.tags.length) metaParts.push(`Tags: ${prayer.tags.join(', ')}`);
  paras.push(new Paragraph({
    children: [new TextRun({ text: metaParts.join('  ·  '), size: 18, color: '888888', italics: true })],
    spacing: { after: 120 },
  }));

  // Request
  paras.push(new Paragraph({
    children: [new TextRun({ text: 'Request', bold: true, size: 20, color: '333333' })],
    spacing: { after: 60 },
  }));
  paras.push(new Paragraph({
    children: [new TextRun({ text: prayer.request, size: 22 })],
    spacing: { after: 160 },
  }));

  // Answer (if present)
  if (prayer.answer) {
    paras.push(new Paragraph({
      children: [new TextRun({ text: 'Answer', bold: true, size: 20, color: '4A8C6A' })],
      spacing: { after: 60 },
    }));
    paras.push(new Paragraph({
      children: [new TextRun({ text: prayer.answer, size: 22, color: '2D5C40' })],
      spacing: { after: 80 },
    }));
    if (prayer.answeredAt) {
      paras.push(new Paragraph({
        children: [new TextRun({ text: `Answered ${fmtDate(prayer.answeredAt)}`, size: 18, italics: true, color: '888888' })],
        spacing: { after: 160 },
      }));
    }
  }

  // Notes (if present)
  if (prayer.notes && prayer.notes.trim()) {
    paras.push(new Paragraph({
      children: [new TextRun({ text: 'Notes', bold: true, size: 20, color: '5A5A2A' })],
      spacing: { after: 60 },
    }));
    paras.push(new Paragraph({
      children: [new TextRun({ text: prayer.notes, size: 22 })],
      spacing: { after: 160 },
    }));
  }

  // Prayer log (if present)
  if (prayer.prayedLog && prayer.prayedLog.length > 0) {
    paras.push(new Paragraph({
      children: [new TextRun({ text: `Prayer Log (${prayer.prayedLog.length} session${prayer.prayedLog.length !== 1 ? 's' : ''})`, bold: true, size: 20, color: '4B6FA8' })],
      spacing: { after: 60 },
    }));
    const sorted = [...prayer.prayedLog].sort((a, b) => new Date(b.date) - new Date(a.date));
    sorted.forEach(entry => {
      const runs = [new TextRun({ text: fmtDate(entry.date), bold: true, size: 19, color: '555555' })];
      if (entry.note) runs.push(new TextRun({ text: `  —  ${entry.note}`, size: 19, color: '666666' }));
      paras.push(new Paragraph({ children: runs, spacing: { after: 60 } }));
    });
    paras.push(new Paragraph({ children: [], spacing: { after: 80 } }));
  }

  // Divider paragraph with bottom border
  paras.push(new Paragraph({
    children: [],
    spacing: { after: 200 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: 'E2DAC8' } },
  }));

  return paras;
}

app.get('/api/export', (req, res) => {
  try {
    const all = readPrayers();
    const status = req.query.status || 'all';
    const tag = req.query.tag || '';

    const prayers = all.filter(p => {
      const statusMatch = status === 'all' ? p.status !== 'archived' : p.status === status;
      const tagMatch = tag ? (p.tags || []).includes(tag) : true;
      return statusMatch && tagMatch;
    });

    const active = prayers.filter(p => p.status === 'active');
    const answered = prayers.filter(p => p.status === 'answered');

    const titleLabel = status === 'active' ? 'Active Prayers'
      : status === 'answered' ? 'Answered Prayers'
      : 'Prayer Journal';

    const children = [
      new Paragraph({
        text: 'Prayer Journal',
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
      }),
      new Paragraph({
        children: [new TextRun({ text: `Exported ${fmtDate(new Date().toISOString())}`, size: 20, italics: true, color: '888888' })],
        alignment: AlignmentType.CENTER,
        spacing: { after: tag ? 80 : 480 },
      }),
    ];

    if (tag) {
      children.push(new Paragraph({
        children: [new TextRun({ text: `Tag: ${tag}`, size: 20, italics: true, color: '4B6FA8' })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 480 },
      }));
    }

    if (status === 'all' || status === 'active') {
      if (active.length) {
        children.push(new Paragraph({
          text: `Active Prayers (${active.length})`,
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 0, after: 240 },
        }));
        active.forEach((p, i) => children.push(...prayerToSection(p, i)));
      }
    }

    if (status === 'all' && answered.length && active.length) {
      children.push(new Paragraph({ children: [new PageBreak()] }));
    }

    if (status === 'all' || status === 'answered') {
      if (answered.length) {
        children.push(new Paragraph({
          text: `Answered Prayers (${answered.length})`,
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 0, after: 240 },
        }));
        answered.forEach((p, i) => children.push(...prayerToSection(p, i)));
      }
    }

    if (prayers.length === 0) {
      children.push(new Paragraph({
        children: [new TextRun({ text: 'No prayers found.', italics: true, color: '888888' })],
      }));
    }

    const doc = new Document({
      styles: {
        default: {
          document: {
            run: { font: 'Palatino Linotype', size: 22 },
          },
        },
        paragraphStyles: [
          {
            id: 'Title',
            name: 'Title',
            basedOn: 'Normal',
            run: { size: 56, bold: false, color: '252018', font: 'Palatino Linotype' },
            paragraph: { spacing: { before: 0, after: 120 } },
          },
          {
            id: 'Heading1',
            name: 'Heading 1',
            basedOn: 'Normal',
            run: { size: 32, bold: true, color: '4B6FA8', font: 'Palatino Linotype' },
            paragraph: {
              spacing: { before: 480, after: 240 },
              border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: 'C4A882' } },
            },
          },
        ],
      },
      sections: [{
        properties: {
          page: { size: { width: 12240, height: 15840 } },
          margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
        },
        footers: {
          default: new Footer({
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ children: [PageNumber.CURRENT], size: 18, color: '888888' }),
                new TextRun({ text: ' / ', size: 18, color: '888888' }),
                new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: '888888' }),
              ],
            })],
          }),
        },
        children,
      }],
    });

    Packer.toBuffer(doc).then(buffer => {
      const filename = `prayer-journal-${new Date().toISOString().slice(0, 10)}.docx`;
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.send(buffer);
    });
  } catch (err) {
    console.error('Export failed:', err.message);
    res.status(500).json({ error: 'Export failed: ' + err.message });
  }
});

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
    const prayer = { id: randomUUID(), ...req.body };
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

app.get('*splat', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}, data: ${DATA_FILE}`));
