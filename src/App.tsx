import React, { useState, useMemo } from 'react';
import { usePrayers } from './usePrayers';
import { Prayer, PrayedEntry } from './types';
import './App.css';

type Filter = 'active' | 'answered' | 'all';
type Tab = 'prayers' | 'calendar';

const DOT_PALETTE = [
  '#c07a3a', '#3d6b52', '#6b4545', '#456b8a',
  '#7a5c8a', '#8a7a3a', '#3a6b6b', '#8a4a6b',
];

function prayerColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) & 0xffffffff;
  return DOT_PALETTE[Math.abs(hash) % DOT_PALETTE.length];
}

function normalize(s: string) {
  return s.toLowerCase().trim();
}

function matches(prayer: Prayer, query: string) {
  const q = normalize(query);
  if (!q) return true;
  return (
    normalize(prayer.person).includes(q) ||
    normalize(prayer.request).includes(q) ||
    normalize(prayer.answer).includes(q) ||
    prayer.tags.some(t => normalize(t).includes(q))
  );
}

export default function App() {
  const {
    prayers,
    loading,
    error: apiError,
    addPrayer,
    updateAnswer,
    markAnswered,
    markActive,
    archivePrayer,
    deletePrayer,
    updateRequest,
    updateNotes,
    logPrayed,
  } = usePrayers();

  const [tab, setTab] = useState<Tab>('prayers');
  const [filter, setFilter] = useState<Filter>('active');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [newPerson, setNewPerson] = useState('');
  const [newRequest, setNewRequest] = useState('');
  const [newTags, setNewTags] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingAnswer, setEditingAnswer] = useState<{ id: string; text: string } | null>(null);
  const [writeError, setWriteError] = useState<string | null>(null);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    prayers.filter(p => p.status !== 'archived').forEach(p => p.tags.forEach(t => set.add(t)));
    return Array.from(set).sort();
  }, [prayers]);

  const filtered = useMemo(() => prayers.filter(p => {
    const statusMatch =
      filter === 'active' ? p.status === 'active' :
      filter === 'answered' ? p.status === 'answered' :
      p.status !== 'archived';
    const tagMatch = activeTag ? p.tags.includes(activeTag) : true;
    const searchMatch = matches(p, search);
    return statusMatch && tagMatch && searchMatch;
  }), [prayers, filter, activeTag, search]);

  const counts = {
    active: prayers.filter(p => p.status === 'active').length,
    answered: prayers.filter(p => p.status === 'answered').length,
  };

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newRequest.trim()) return;
    const tags = newTags.split(',').map(t => t.trim()).filter(Boolean);
    try {
      await addPrayer(newPerson.trim(), newRequest.trim(), tags);
      setNewPerson('');
      setNewRequest('');
      setNewTags('');
      setWriteError(null);
    } catch (err: any) {
      setWriteError(err.message);
    }
  }

  async function handleSaveAnswer(id: string) {
    if (!editingAnswer) return;
    try {
      await updateAnswer(id, editingAnswer.text);
      await markAnswered(id);
      setEditingAnswer(null);
      setExpandedId(null);
      setWriteError(null);
    } catch (err: any) {
      setWriteError(err.message);
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  }

  function handleTagClick(tag: string) {
    setActiveTag(prev => prev === tag ? null : tag);
  }

  function handleExport() {
    const params = new URLSearchParams();
    params.set('status', filter);
    if (activeTag) params.set('tag', activeTag);
    window.location.href = `/api/export?${params.toString()}`;
  }

  const emptyMessage = search
    ? `No results for "${search}".`
    : activeTag
    ? `No ${filter === 'all' ? '' : filter + ' '}prayers tagged "${activeTag}".`
    : filter === 'active'
    ? 'No active prayers. Add one above.'
    : 'Nothing here yet.';

  return (
    <div className="app">
      <header className="header">
        <h1>Prayer Journal</h1>
        <p className="subtitle">Bring your requests. Record His faithfulness.</p>
      </header>

      <div className="tab-bar">
        <button
          className={`tab-btn ${tab === 'prayers' ? 'active' : ''}`}
          onClick={() => setTab('prayers')}
        >
          Prayers
        </button>
        <button
          className={`tab-btn ${tab === 'calendar' ? 'active' : ''}`}
          onClick={() => setTab('calendar')}
        >
          Calendar
        </button>
      </div>

      {tab === 'prayers' && (
        <>
          <form className="add-form" onSubmit={handleAdd}>
            <input
              className="person-input"
              placeholder="Who are you praying for? (optional)"
              value={newPerson}
              onChange={e => setNewPerson(e.target.value)}
            />
            <textarea
              className="request-input"
              placeholder="What would you like to pray about?"
              value={newRequest}
              onChange={e => setNewRequest(e.target.value)}
              rows={3}
            />
            <div className="add-row">
              <input
                className="tag-input"
                placeholder="Tags (comma separated)"
                value={newTags}
                onChange={e => setNewTags(e.target.value)}
              />
              <button className="btn btn-primary" type="submit">
                Add Prayer
              </button>
            </div>
          </form>

          <div className="toolbar">
            <div className="filter-bar">
              <button
                className={`filter-btn ${filter === 'active' ? 'active' : ''}`}
                onClick={() => setFilter('active')}
              >
                Active <span className="count">{counts.active}</span>
              </button>
              <button
                className={`filter-btn ${filter === 'answered' ? 'active' : ''}`}
                onClick={() => setFilter('answered')}
              >
                Answered <span className="count">{counts.answered}</span>
              </button>
              <button
                className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
                onClick={() => setFilter('all')}
              >
                All
              </button>
            </div>

            <button className="btn btn-export" onClick={handleExport} title="Export to Word">
              ↓ Export
            </button>

            <div className="search-wrap">
              <span className="search-icon">⌕</span>
              <input
                className="search-input"
                placeholder="Search prayers…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search && (
                <button className="search-clear" onClick={() => setSearch('')}>✕</button>
              )}
            </div>
          </div>

          {allTags.length > 0 && (
            <div className="tag-filter-bar">
              <span className="tag-filter-label">Tags:</span>
              {allTags.map(tag => (
                <button
                  key={tag}
                  className={`tag-filter-btn ${activeTag === tag ? 'active' : ''}`}
                  onClick={() => handleTagClick(tag)}
                >
                  {tag}
                </button>
              ))}
              {activeTag && (
                <button className="tag-clear-btn" onClick={() => setActiveTag(null)}>✕ Clear</button>
              )}
            </div>
          )}

          {(writeError || apiError) && (
            <div className="error-banner">⚠ {writeError || apiError}</div>
          )}

          {loading && <p className="loading">Loading prayers…</p>}

          <ul className="prayer-list">
            {filtered.length === 0 && !loading && (
              <li className="empty">{emptyMessage}</li>
            )}

            {filtered.map(prayer => (
              <PrayerCard
                key={prayer.id}
                prayer={prayer}
                expanded={expandedId === prayer.id}
                editingAnswer={editingAnswer?.id === prayer.id ? editingAnswer.text : null}
                activeTag={activeTag}
                searchQuery={search}
                onTagClick={handleTagClick}
                onToggle={() => setExpandedId(expandedId === prayer.id ? null : prayer.id)}
                onStartAnswer={() => {
                  setExpandedId(prayer.id);
                  setEditingAnswer({ id: prayer.id, text: prayer.answer });
                }}
                onEditAnswer={text => setEditingAnswer({ id: prayer.id, text })}
                onSaveAnswer={() => handleSaveAnswer(prayer.id)}
                onCancelAnswer={() => setEditingAnswer(null)}
                onMarkActive={() => markActive(prayer.id)}
                onArchive={() => archivePrayer(prayer.id)}
                onDelete={() => deletePrayer(prayer.id)}
                onEditRequest={text => updateRequest(prayer.id, text)}
                onLogPrayed={entry => logPrayed(prayer.id, entry)}
                onSaveNotes={notes => updateNotes(prayer.id, notes)}
                formatDate={formatDate}
              />
            ))}
          </ul>
        </>
      )}

      {tab === 'calendar' && (
        <CalendarView prayers={prayers} formatDate={formatDate} />
      )}
    </div>
  );
}

function highlight(text: string, query: string) {
  if (!query.trim()) return <>{text}</>;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? <mark key={i} className="highlight">{part}</mark> : part
      )}
    </>
  );
}

interface CardProps {
  prayer: Prayer;
  expanded: boolean;
  editingAnswer: string | null;
  activeTag: string | null;
  searchQuery: string;
  onTagClick: (tag: string) => void;
  onToggle: () => void;
  onStartAnswer: () => void;
  onEditAnswer: (text: string) => void;
  onSaveAnswer: () => void;
  onCancelAnswer: () => void;
  onMarkActive: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onEditRequest: (text: string) => void;
  onLogPrayed: (entry: PrayedEntry) => void;
  onSaveNotes: (notes: string) => void;
  formatDate: (iso: string) => string;
}

function PrayerCard({
  prayer,
  expanded,
  editingAnswer,
  activeTag,
  searchQuery,
  onTagClick,
  onToggle,
  onStartAnswer,
  onEditAnswer,
  onSaveAnswer,
  onCancelAnswer,
  onMarkActive,
  onArchive,
  onDelete,
  onLogPrayed,
  onSaveNotes,
  formatDate,
}: CardProps) {
  const [logDate, setLogDate] = useState(new Date().toISOString().slice(0, 10));
  const [logNote, setLogNote] = useState('');
  const [showLogForm, setShowLogForm] = useState(false);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);

  function handleLogSubmit(e: React.FormEvent) {
    e.preventDefault();
    onLogPrayed({ date: logDate, note: logNote.trim() });
    setLogNote('');
    setShowLogForm(false);
  }

  function handleNotesSave() {
    if (editingNotes === null) return;
    onSaveNotes(editingNotes);
    setEditingNotes(null);
  }

  const sortedLog = [...(prayer.prayedLog ?? [])].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const color = prayerColor(prayer.id);

  return (
    <li className={`prayer-card ${prayer.status}`} style={{ borderLeftColor: color }}>
      <div className="card-top" onClick={onToggle}>
        <div className="card-main">
          <span className="status-dot" style={{ background: color }} />
          <div className="card-text">
            {prayer.person && (
              <p className="person-name">{highlight(prayer.person, searchQuery)}</p>
            )}
            <p className="request-text">{highlight(prayer.request, searchQuery)}</p>
          </div>
        </div>
        <div className="card-meta">
          <span className="date">{formatDate(prayer.createdAt)}</span>
          {prayer.prayedLog && prayer.prayedLog.length > 0 && (
            <span className="prayed-count" title={`Prayed ${prayer.prayedLog.length} time${prayer.prayedLog.length !== 1 ? 's' : ''}`}>
              🙏 {prayer.prayedLog.length}
            </span>
          )}
          {prayer.tags.map(tag => (
            <span
              key={tag}
              className={`tag ${activeTag === tag ? 'tag-active' : ''}`}
              onClick={e => { e.stopPropagation(); onTagClick(tag); }}
            >
              {tag}
            </span>
          ))}
          <span className="chevron">{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {expanded && (
        <div className="card-body">
          {prayer.status === 'answered' && prayer.answer && editingAnswer === null && (
            <div className="answer-section">
              <label className="answer-label">Answer</label>
              <p className="answer-text">{highlight(prayer.answer, searchQuery)}</p>
              {prayer.answeredAt && (
                <span className="answered-date">Answered {formatDate(prayer.answeredAt)}</span>
              )}
              <button className="btn btn-sm" onClick={onStartAnswer}>Edit answer</button>
            </div>
          )}

          {(prayer.status === 'active' || editingAnswer !== null) && (
            <div className="answer-section">
              <label className="answer-label">
                {prayer.status === 'answered' ? 'Edit answer' : 'Record answer'}
              </label>
              <textarea
                className="answer-input"
                placeholder="How did God answer this prayer?"
                value={editingAnswer ?? prayer.answer}
                onChange={e => onEditAnswer(e.target.value)}
                rows={4}
              />
              <div className="card-actions">
                <button className="btn btn-primary btn-sm" onClick={onSaveAnswer}>
                  Mark Answered
                </button>
                {editingAnswer !== null && prayer.status === 'answered' && (
                  <button className="btn btn-sm" onClick={onCancelAnswer}>Cancel</button>
                )}
              </div>
            </div>
          )}

          {/* Notes section */}
          <div className="notes-section">
            <div className="prayed-log-header">
              <label className="answer-label">Notes</label>
              {editingNotes === null && (
                <button className="btn btn-sm" onClick={() => setEditingNotes(prayer.notes ?? '')}>
                  {prayer.notes ? 'Edit' : '+ Add notes'}
                </button>
              )}
            </div>
            {editingNotes !== null ? (
              <>
                <textarea
                  className="log-note-input"
                  placeholder="Scripture, updates, mid-prayer thoughts…"
                  value={editingNotes}
                  onChange={e => setEditingNotes(e.target.value)}
                  rows={4}
                  autoFocus
                />
                <div className="card-actions">
                  <button className="btn btn-primary btn-sm" onClick={handleNotesSave}>Save</button>
                  <button className="btn btn-sm" onClick={() => setEditingNotes(null)}>Cancel</button>
                </div>
              </>
            ) : prayer.notes ? (
              <p className="notes-text">{prayer.notes}</p>
            ) : (
              <p className="prayed-log-empty">No notes yet.</p>
            )}
          </div>

          {/* Prayer log section */}
          <div className="prayed-log-section">
            <div className="prayed-log-header">
              <label className="answer-label">Prayer Log</label>
              {!showLogForm && (
                <button
                  className="btn btn-sm btn-primary"
                  onClick={() => setShowLogForm(true)}
                >
                  + I Prayed This
                </button>
              )}
            </div>

            {showLogForm && (
              <form className="prayed-log-form" onSubmit={handleLogSubmit}>
                <input
                  type="date"
                  className="log-date-input"
                  value={logDate}
                  onChange={e => setLogDate(e.target.value)}
                />
                <textarea
                  className="log-note-input"
                  placeholder="Notes from this prayer time (optional)"
                  value={logNote}
                  onChange={e => setLogNote(e.target.value)}
                  rows={2}
                />
                <div className="card-actions">
                  <button className="btn btn-primary btn-sm" type="submit">Save</button>
                  <button className="btn btn-sm" type="button" onClick={() => setShowLogForm(false)}>Cancel</button>
                </div>
              </form>
            )}

            {sortedLog.length > 0 ? (
              <ul className="prayed-log-list">
                {sortedLog.map((entry, i) => (
                  <li key={i} className="prayed-log-entry">
                    <span className="prayed-log-date">{formatDate(entry.date)}</span>
                    {entry.note && <p className="prayed-log-note">{entry.note}</p>}
                  </li>
                ))}
              </ul>
            ) : (
              !showLogForm && <p className="prayed-log-empty">No prayer sessions logged yet.</p>
            )}
          </div>

          <div className="card-actions secondary">
            {prayer.status === 'answered' && (
              <button className="btn btn-sm ghost" onClick={onMarkActive}>
                Move back to active
              </button>
            )}
            <button className="btn btn-sm ghost" onClick={onArchive}>Archive</button>
            <button className="btn btn-sm ghost danger" onClick={onDelete}>Delete</button>
          </div>
        </div>
      )}
    </li>
  );
}

function CalendarView({ prayers, formatDate }: { prayers: Prayer[]; formatDate: (iso: string) => string }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const prayedByDate = useMemo(() => {
    const map = new Map<string, Array<{ prayer: Prayer; entry: PrayedEntry }>>() ;
    prayers.forEach(prayer => {
      (prayer.prayedLog ?? []).forEach(entry => {
        const key = entry.date.slice(0, 10);
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push({ prayer, entry });
      });
    });
    return map;
  }, [prayers]);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDow = new Date(year, month, 1).getDay();

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
    setSelectedDate(null);
  }

  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
    setSelectedDate(null);
  }

  const monthName = new Date(year, month).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const selectedEntries = selectedDate ? (prayedByDate.get(selectedDate) ?? []) : [];

  const totalThisMonth = useMemo(() => {
    let count = 0;
    prayedByDate.forEach((entries, date) => {
      if (date.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`)) {
        count += entries.length;
      }
    });
    return count;
  }, [prayedByDate, year, month]);

  return (
    <div className="calendar-view">
      <div className="calendar-header">
        <button className="cal-nav-btn" onClick={prevMonth}>‹</button>
        <span className="cal-month-name">{monthName}</span>
        <button className="cal-nav-btn" onClick={nextMonth}>›</button>
      </div>

      {totalThisMonth > 0 && (
        <p className="cal-summary">{totalThisMonth} prayer session{totalThisMonth !== 1 ? 's' : ''} this month</p>
      )}

      <div className="cal-grid">
        {dayNames.map(d => (
          <div key={d} className="cal-dow">{d}</div>
        ))}

        {Array.from({ length: firstDow }).map((_, i) => (
          <div key={`blank-${i}`} className="cal-cell cal-blank" />
        ))}

        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const entries = prayedByDate.get(dateStr);
          const isToday =
            day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
          const isSelected = selectedDate === dateStr;

          // Deduplicate colors so each prayer shows one dot per day
          const uniqueColors = entries
            ? Array.from(new Map(entries.map(e => [e.prayer.id, prayerColor(e.prayer.id)])).values())
            : [];

          return (
            <div
              key={day}
              className={`cal-cell ${isToday ? 'cal-today' : ''} ${isSelected ? 'cal-selected' : ''} ${entries ? 'cal-has-prayers' : ''}`}
              onClick={() => entries && setSelectedDate(isSelected ? null : dateStr)}
            >
              <span className="cal-day-num">{day}</span>
              {uniqueColors.length > 0 && (
                <span className="cal-dot-row">
                  {uniqueColors.slice(0, 5).map((color, di) => (
                    <span key={di} className="cal-dot" style={{ background: color }} />
                  ))}
                  {uniqueColors.length > 5 && (
                    <span className="cal-dot-more">+{uniqueColors.length - 5}</span>
                  )}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {selectedDate && (
        <div className="cal-detail">
          <h3 className="cal-detail-title">
            {formatDate(selectedDate + 'T12:00:00')}
          </h3>
          {selectedEntries.length === 0 ? (
            <p className="prayed-log-empty">No prayer sessions on this day.</p>
          ) : (
            <ul className="cal-detail-list">
              {selectedEntries.map(({ prayer, entry }, i) => (
                <li key={i} className="cal-detail-entry" style={{ borderLeftColor: prayerColor(prayer.id) }}>
                  <div className="cal-detail-prayer">
                    {prayer.person && <span className="person-name">{prayer.person} — </span>}
                    <span className="request-text">{prayer.request}</span>
                  </div>
                  {entry.note && <p className="prayed-log-note">{entry.note}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
