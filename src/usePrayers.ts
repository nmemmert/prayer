import { useState, useEffect } from 'react';
import { Prayer } from './types';

const STORAGE_KEY = 'prayer-journal';

export function usePrayers() {
  const [prayers, setPrayers] = useState<Prayer[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prayers));
  }, [prayers]);

  function addPrayer(request: string, tags: string[]) {
    const prayer: Prayer = {
      id: crypto.randomUUID(),
      request,
      answer: '',
      status: 'active',
      createdAt: new Date().toISOString(),
      tags,
    };
    setPrayers(prev => [prayer, ...prev]);
  }

  function updateAnswer(id: string, answer: string) {
    setPrayers(prev =>
      prev.map(p => p.id === id ? { ...p, answer } : p)
    );
  }

  function markAnswered(id: string) {
    setPrayers(prev =>
      prev.map(p =>
        p.id === id
          ? { ...p, status: 'answered', answeredAt: new Date().toISOString() }
          : p
      )
    );
  }

  function markActive(id: string) {
    setPrayers(prev =>
      prev.map(p =>
        p.id === id ? { ...p, status: 'active', answeredAt: undefined } : p
      )
    );
  }

  function archivePrayer(id: string) {
    setPrayers(prev =>
      prev.map(p => p.id === id ? { ...p, status: 'archived' } : p)
    );
  }

  function deletePrayer(id: string) {
    setPrayers(prev => prev.filter(p => p.id !== id));
  }

  function updateRequest(id: string, request: string) {
    setPrayers(prev =>
      prev.map(p => p.id === id ? { ...p, request } : p)
    );
  }

  return {
    prayers,
    addPrayer,
    updateAnswer,
    markAnswered,
    markActive,
    archivePrayer,
    deletePrayer,
    updateRequest,
  };
}
