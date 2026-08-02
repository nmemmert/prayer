export interface PrayedEntry {
  date: string;
  note: string;
}

export interface Prayer {
  id: string;
  person: string;
  request: string;
  answer: string;
  notes?: string;
  status: 'active' | 'answered' | 'archived';
  createdAt: string;
  answeredAt?: string;
  tags: string[];
  prayedLog?: PrayedEntry[];
  reminderDays?: string[]; // e.g. ['mon', 'wed', 'fri']
}

export interface AppSettings {
  ntfyTopic?: string;
  dailyDigestTime?: string; // HH:MM
  reminderTime?: string;    // HH:MM — time per-prayer reminders fire
}
