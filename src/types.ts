export interface PrayedEntry {
  date: string;
  note: string;
}

export interface Prayer {
  id: string;
  person: string;
  request: string;
  answer: string;
  status: 'active' | 'answered' | 'archived';
  createdAt: string;
  answeredAt?: string;
  tags: string[];
  prayedLog?: PrayedEntry[];
}
