import { useState, useEffect, useCallback } from 'react';
import { AppSettings } from './types';

const API = '/api/settings';

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(API)
      .then(r => r.json())
      .then(setSettings)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const saveSettings = useCallback(async (updates: Partial<AppSettings>) => {
    const res = await fetch(API, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to save settings');
    const updated = await res.json();
    setSettings(updated);
    return updated;
  }, []);

  const testNotification = useCallback(async () => {
    const res = await fetch('/api/notifications/test', { method: 'POST' });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || 'Test failed');
    }
  }, []);

  return { settings, loading, saveSettings, testNotification };
}
