export type EntryCategory = 
  | 'reflection'
  | 'gratitude'
  | 'brainstorm'
  | 'daily_log'
  | 'deep_thought';

export interface JournalLocation {
  placeName: string;
  lat: number;
  lng: number;
  formattedAddress?: string;
  city?: string;
  country?: string;
}

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
  location?: JournalLocation;
}

export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  role?: 'admin' | 'user';
  totalReflections?: number;
  geocodedPlacesCount?: number;
  updatedAt?: number;
  createdAt?: number;
}

export interface PlatformTelemetry {
  totalEntriesCount: number;
  categoryCounts: Record<EntryCategory, number>;
  totalWordCount: number;
  entriesWithLocationCount: number;
  locationsList: { placeName: string; count: number; lat: number; lng: number }[];
  activeModelLadder: string[];
  serverStatus: 'ok' | 'degraded';
  geminiKeyConfigured: boolean;
  lastCalculatedAt: number;
}
