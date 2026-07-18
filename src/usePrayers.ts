import { useState, useEffect, useCallback } from 'react';
import { Prayer } from './types';

const API = '/api/prayers';

async function checkResponse(r: Response) {
  if (!r.ok) {
    const body = await r.json().catch(() => ({}));
    throw new Error(body.error || `Server error ${r.status}`);
  }
  return r;
}

export function usePrayers() {
  const [prayers, setPrayers] = useState<Prayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(API)
      .then(r => r.json())
      .then(setPrayers)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const addPrayer = useCallback(async (person: string, request: string, tags: string[]) => {
    const prayer = {
      person,
      request,
      answer: '',
      status: 'active',
      createdAt: new Date().toISOString(),
      tags,
    };
    const saved = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(prayer),
    }).then(checkResponse).then(r => r.json());
    setPrayers(prev => [saved, ...prev]);
  }, []);

  const patch = useCallback(async (id: string, updates: Partial<Prayer>) => {
    const updated = await fetch(`${API}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    }).then(checkResponse).then(r => r.json());
    setPrayers(prev => prev.map(p => p.id === id ? updated : p));
  }, []);

  const updateAnswer = useCallback((id: string, answer: string) =>
    patch(id, { answer }), [patch]);

  const markAnswered = useCallback((id: string) =>
    patch(id, { status: 'answered', answeredAt: new Date().toISOString() }), [patch]);

  const markActive = useCallback((id: string) =>
    patch(id, { status: 'active', answeredAt: undefined }), [patch]);

  const archivePrayer = useCallback((id: string) =>
    patch(id, { status: 'archived' }), [patch]);

  const updateRequest = useCallback((id: string, request: string) =>
    patch(id, { request }), [patch]);

  const deletePrayer = useCallback(async (id: string) => {
    await fetch(`${API}/${id}`, { method: 'DELETE' }).then(checkResponse);
    setPrayers(prev => prev.filter(p => p.id !== id));
  }, []);

  return {
    prayers,
    loading,
    error,
    addPrayer,
    updateAnswer,
    markAnswered,
    markActive,
    archivePrayer,
    deletePrayer,
    updateRequest,
  };
}
