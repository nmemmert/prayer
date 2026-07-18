import React, { useState, useMemo } from 'react';
import { usePrayers } from './usePrayers';
import { Prayer } from './types';
import './App.css';

type Filter = 'active' | 'answered' | 'all';

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
  } = usePrayers();

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
            formatDate={formatDate}
          />
        ))}
      </ul>
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
  formatDate,
}: CardProps) {
  return (
    <li className={`prayer-card ${prayer.status}`}>
      <div className="card-top" onClick={onToggle}>
        <div className="card-main">
          <span className={`status-dot ${prayer.status}`} />
          <div className="card-text">
            {prayer.person && (
              <p className="person-name">{highlight(prayer.person, searchQuery)}</p>
            )}
            <p className="request-text">{highlight(prayer.request, searchQuery)}</p>
          </div>
        </div>
        <div className="card-meta">
          <span className="date">{formatDate(prayer.createdAt)}</span>
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
