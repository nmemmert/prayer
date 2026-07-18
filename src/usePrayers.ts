import { useState, useEffect, useCallback } from 'react';
import { Prayer } from './types';

const API = '/api/prayers';

export function usePrayers() {
  const [prayers, setPrayers] = useState<Prayer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(API)
      .then(r => r.json())
      .then(setPrayers)
      .finally(() => setLoading(false));
  }, []);

  const addPrayer = useCallback(async (request: string, tags: string[]) => {
    const prayer: Prayer = {
      id: crypto.randomUUID(),
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
    }).then(r => r.json());
    setPrayers(prev => [saved, ...prev]);
  }, []);

  const patch = useCallback(async (id: string, updates: Partial<Prayer>) => {
    const updated = await fetch(`${API}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    }).then(r => r.json());
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
    await fetch(`${API}/${id}`, { method: 'DELETE' });
    setPrayers(prev => prev.filter(p => p.id !== id));
  }, []);

  return {
    prayers,
    loading,
    addPrayer,
    updateAnswer,
    markAnswered,
    markActive,
    archivePrayer,
    deletePrayer,
    updateRequest,
  };
}
