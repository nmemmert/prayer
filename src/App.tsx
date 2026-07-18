import React, { useState } from 'react';
import { usePrayers } from './usePrayers';
import { Prayer } from './types';
import './App.css';

type Filter = 'active' | 'answered' | 'all';

export default function App() {
  const {
    prayers,
    loading,
    addPrayer,
    updateAnswer,
    markAnswered,
    markActive,
    archivePrayer,
    deletePrayer,
    updateRequest,
  } = usePrayers();

  const [filter, setFilter] = useState<Filter>('active');
  const [newRequest, setNewRequest] = useState('');
  const [newTags, setNewTags] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingAnswer, setEditingAnswer] = useState<{ id: string; text: string } | null>(null);

  const filtered = prayers.filter(p => {
    if (filter === 'active') return p.status === 'active';
    if (filter === 'answered') return p.status === 'answered';
    return p.status !== 'archived';
  });

  const counts = {
    active: prayers.filter(p => p.status === 'active').length,
    answered: prayers.filter(p => p.status === 'answered').length,
  };

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newRequest.trim()) return;
    const tags = newTags
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);
    addPrayer(newRequest.trim(), tags);
    setNewRequest('');
    setNewTags('');
  }

  function handleSaveAnswer(id: string) {
    if (!editingAnswer) return;
    updateAnswer(id, editingAnswer.text);
    markAnswered(id);
    setEditingAnswer(null);
    setExpandedId(null);
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  return (
    <div className="app">
      <header className="header">
        <h1>Prayer Journal</h1>
        <p className="subtitle">Bring your requests. Record His faithfulness.</p>
      </header>

      <form className="add-form" onSubmit={handleAdd}>
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

      {loading && <p className="loading">Loading prayers…</p>}

      <ul className="prayer-list">
        {filtered.length === 0 && (
          <li className="empty">
            {filter === 'active'
              ? 'No active prayers. Add one above.'
              : 'Nothing here yet.'}
          </li>
        )}

        {filtered.map(prayer => (
          <PrayerCard
            key={prayer.id}
            prayer={prayer}
            expanded={expandedId === prayer.id}
            editingAnswer={editingAnswer?.id === prayer.id ? editingAnswer.text : null}
            onToggle={() =>
              setExpandedId(expandedId === prayer.id ? null : prayer.id)
            }
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

interface CardProps {
  prayer: Prayer;
  expanded: boolean;
  editingAnswer: string | null;
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
          <p className="request-text">{prayer.request}</p>
        </div>
        <div className="card-meta">
          <span className="date">{formatDate(prayer.createdAt)}</span>
          {prayer.tags.map(tag => (
            <span key={tag} className="tag">{tag}</span>
          ))}
          <span className="chevron">{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {expanded && (
        <div className="card-body">
          {prayer.status === 'answered' && prayer.answer && editingAnswer === null && (
            <div className="answer-section">
              <label className="answer-label">Answer</label>
              <p className="answer-text">{prayer.answer}</p>
              {prayer.answeredAt && (
                <span className="answered-date">
                  Answered {formatDate(prayer.answeredAt)}
                </span>
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
