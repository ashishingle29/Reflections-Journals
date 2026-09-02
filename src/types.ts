export type EntryCategory = 
  | 'reflection'
  | 'gratitude'
  | 'brainstorm'
  | 'daily_log'
  | 'deep_thought';

export interface JournalTurn {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  modelUsed?: string;
  mode?: 'chat' | 'brainstorm';
}

export interface JournalEntry {
  id: string;
  userId: string;
  title: string;
  category: EntryCategory;
  createdAt: number;
  updatedAt: number;
  turns: JournalTurn[];
  summary?: string;
  summaryModel?: string;
  isUserCustomTitle?: boolean;
}

export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}
