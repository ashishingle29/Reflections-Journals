import { useState, useEffect, useCallback, useMemo } from 'react';
import { Navbar } from './components/Navbar';
import { LandingView } from './components/LandingView';
import { EntryHistorySidebar } from './components/EntryHistorySidebar';
import { EntryEditor } from './components/EntryEditor';
import { JourneyMapView } from './components/JourneyMapView';
import { AdminDashboard } from './components/AdminDashboard';
import type { UserProfile, JournalEntry, JournalLocation, EntryCategory } from './types';
import { 
  signInWithGoogle, 
  logOut, 
  subscribeToAuthState,
  fetchUserJournalEntries,
  saveUserJournalEntry,
  deleteUserJournalEntry,
  updateUserReflectionsStats,
  extractFirestoreErrorMessage
} from './lib/firebase';

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [isLoadingEntries, setIsLoadingEntries] = useState(false);
  const [activeView, setActiveView] = useState<'journal' | 'map' | 'admin'>('journal');

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastPendingEntry, setLastPendingEntry] = useState<JournalEntry | null>(null);

  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024;
    }
    return true;
  });

  // Subscribe to Firebase Authentication
  useEffect(() => {
    const unsubscribe = subscribeToAuthState((profile) => {
      setUser(profile);
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Fetch entries whenever user logs in
  const loadEntries = useCallback(async (userId: string) => {
    setIsLoadingEntries(true);
    setSaveError(null);
    try {
      const userEntries = await fetchUserJournalEntries(userId);
      if (userEntries.length > 0) {
        setEntries(userEntries);
        setSelectedEntryId((prevId) => {
          if (prevId && userEntries.some((e) => e.id === prevId)) {
            return prevId;
          }
          return userEntries[0].id;
        });
      } else {
        // No saved entries in Firestore yet: prepare an unsaved local draft (not stored in DB until chat starts)
        const initialDraft: JournalEntry = {
          id: `entry-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          userId,
          title: 'New Reflection',
          category: 'reflection',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          turns: [],
          isUserCustomTitle: false,
        };
        setEntries([initialDraft]);
        setSelectedEntryId(initialDraft.id);
      }
    } catch (err: any) {
      console.error('Failed to load user entries from Firestore:', err);
      setSaveError(`Failed to load entries from Firestore: ${extractFirestoreErrorMessage(err)}`);
    } finally {
      setIsLoadingEntries(false);
    }
  }, []);

  useEffect(() => {
    if (user?.uid) {
      loadEntries(user.uid);
    } else {
      setEntries([]);
      setSelectedEntryId(null);
    }
  }, [user?.uid, loadEntries]);

  // Synchronize reflection volume and geocoded places count to Firestore user profile
  useEffect(() => {
    if (user?.uid && !user.uid.startsWith('demo-')) {
      const persistedEntries = entries.filter((e) => e.turns.length > 0 || e.location);
      const totalReflections = persistedEntries.length;
      const geocodedPlacesCount = persistedEntries.filter((e) => e.location?.placeName).length;
      updateUserReflectionsStats(user.uid, totalReflections, geocodedPlacesCount);
    }
  }, [entries, user?.uid]);

  // Auth actions
  const handleSignIn = async () => {
    setAuthError(null);
    setIsAuthLoading(true);
    try {
      const signedInUser = await signInWithGoogle();
      // If signedInUser is null, user intentionally dismissed the popup
      if (!signedInUser) {
        setAuthError(null);
      }
    } catch (err: any) {
      const errorCode = err?.code || '';
      const errorMsg = typeof err?.message === 'string' ? err.message : '';

      // Harmless cancellation: user closed the window or clicked outside
      if (
        errorCode === 'auth/popup-closed-by-user' ||
        errorCode === 'auth/cancelled-popup-request' ||
        errorCode === 'auth/user-cancelled' ||
        errorMsg.includes('auth/popup-closed-by-user') ||
        errorMsg.includes('popup-closed-by-user')
      ) {
        setAuthError(null);
        return;
      }

      if (errorCode === 'auth/popup-blocked' || errorMsg.includes('popup-blocked')) {
        setAuthError('The sign-in popup was blocked by your browser. Please allow popups for this site or open the app in a new window.');
      } else if (errorCode === 'auth/network-request-failed' || errorMsg.includes('network-request-failed')) {
        setAuthError('Network error connecting to authentication server. Please check your internet connection.');
      } else {
        setAuthError(errorMsg || 'Failed to authenticate with Google. Please try again.');
      }
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await logOut();
      setUser(null);
      setEntries([]);
      setSelectedEntryId(null);
    } catch (err: any) {
      console.error('Sign out error:', err);
    }
  };

  const handleAddSampleEntry = () => {
    if (!user) return;
    const sampleEntry: JournalEntry = {
      id: `entry-${Date.now()}-kyoto`,
      userId: user.uid,
      title: 'Morning Serenity at Arashiyama',
      category: 'reflection',
      createdAt: Date.now() - 3600000,
      updatedAt: Date.now(),
      isUserCustomTitle: true,
      location: {
        placeName: 'Kyoto Arashiyama Bamboo Grove',
        city: 'Kyoto',
        country: 'Japan',
        lat: 35.0169,
        lng: 135.6713,
        formattedAddress: 'Kyoto, Japan',
      },
      turns: [
        {
          id: 'turn-1',
          role: 'user',
          content: 'Walking early among the towering bamboo stalks before the crowds arrived gave me space to reconnect with what truly matters.',
          timestamp: Date.now() - 3500000,
        },
        {
          id: 'turn-2',
          role: 'assistant',
          content: 'There is a profound stillness in creating physical and mental space before the world rushes in. Notice how the rhythmic rustling of the bamboo mirrors the natural rhythm of intentional focus.',
          timestamp: Date.now() - 3400000,
        },
      ],
      summary: 'A quiet morning walk through Kyoto’s bamboo groves brought immediate mental spaciousness and renewed clarity on personal values.',
    };

    setEntries((prev) => [sampleEntry, ...prev.filter((e) => e.id !== sampleEntry.id)]);
    setSelectedEntryId(sampleEntry.id);
  };

  // Create a new journal entry (Draft in local memory - NOT stored in DB until chat starts)
  const handleNewEntry = useCallback(() => {
    if (!user) return;

    setEntries((prev) => {
      // If an empty unstarted draft already exists, switch to it rather than creating empty duplicates
      const existingEmptyDraft = prev.find((e) => e.turns.length === 0);
      if (existingEmptyDraft) {
        setSelectedEntryId(existingEmptyDraft.id);
        return prev;
      }

      const newEntry: JournalEntry = {
        id: `entry-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        userId: user.uid,
        title: 'New Reflection',
        category: 'reflection',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        turns: [],
        isUserCustomTitle: false,
      };

      setSelectedEntryId(newEntry.id);
      return [newEntry, ...prev];
    });

    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  }, [user]);

  // Create a new journal entry with a location pinned directly from the journey map
  const handleCreateEntryWithLocation = useCallback(
    async (
      loc: JournalLocation,
      title?: string,
      category: EntryCategory = 'reflection'
    ): Promise<JournalEntry> => {
      if (!user) throw new Error('User not authenticated');

      const cleanTitle = title?.trim() || loc.placeName || 'New Sanctuary Reflection';
      const newEntry: JournalEntry = {
        id: `entry-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        userId: user.uid,
        title: cleanTitle,
        category: category,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isUserCustomTitle: !!title?.trim(),
        location: loc,
        turns: [],
      };

      setEntries((prev) => [newEntry, ...prev]);
      setSelectedEntryId(newEntry.id);

      if (user.uid.startsWith('demo-')) {
        try {
          const currentList = entries.filter((e) => e.id !== newEntry.id);
          localStorage.setItem(`demo_entries_${user.uid}`, JSON.stringify([newEntry, ...currentList]));
        } catch {}
        return newEntry;
      }

      setIsSaving(true);
      setSaveError(null);
      setLastPendingEntry(newEntry);

      try {
        await saveUserJournalEntry(user.uid, newEntry);
        setLastPendingEntry(null);
      } catch (err: any) {
        console.error('Failed to save newly pinned entry:', err);
        setSaveError(extractFirestoreErrorMessage(err));
      } finally {
        setIsSaving(false);
      }

      return newEntry;
    },
    [user, entries]
  );

  // Update entry in state and persist to Firestore (if chat has started OR location is pinned)
  const handleUpdateEntry = async (updatedEntry: JournalEntry) => {
    if (!user) return;

    // Optimistic local state update
    setEntries((prev) =>
      prev.map((e) => (e.id === updatedEntry.id ? updatedEntry : e))
    );

    // Persist to demo storage if in demo mode
    if (user.uid.startsWith('demo-')) {
      try {
        const updatedList = entries.map((e) => (e.id === updatedEntry.id ? updatedEntry : e));
        localStorage.setItem(`demo_entries_${user.uid}`, JSON.stringify(updatedList));
      } catch {}
      return;
    }

    // If neither chat turns exist nor a location is tagged, keep in local memory only
    if (updatedEntry.turns.length === 0 && !updatedEntry.location) {
      setSaveError(null);
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setLastPendingEntry(updatedEntry);

    try {
      await saveUserJournalEntry(user.uid, updatedEntry);
      setLastPendingEntry(null);
    } catch (err: any) {
      console.error('Firestore save failed:', err);
      setSaveError(extractFirestoreErrorMessage(err));
      throw err; // Allow child component to know save failed
    } finally {
      setIsSaving(false);
    }
  };

  // Retry saving if an earlier save attempt failed
  const handleRetrySave = async () => {
    if (!user || !lastPendingEntry || lastPendingEntry.turns.length === 0) return;
    setIsSaving(true);
    try {
      await saveUserJournalEntry(user.uid, lastPendingEntry);
      setSaveError(null);
      setLastPendingEntry(null);
    } catch (err: any) {
      setSaveError(extractFirestoreErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  // Delete an entry from Firestore (if persisted) and local state
  const handleDeleteEntry = async (entryId: string) => {
    if (!user) return;
    try {
      const entryToDelete = entries.find((e) => e.id === entryId);
      // Only invoke Firestore delete if the entry was actually persisted (turns > 0 or has location)
      if (entryToDelete && (entryToDelete.turns.length > 0 || entryToDelete.location)) {
        await deleteUserJournalEntry(user.uid, entryId);
      }
      const remaining = entries.filter((e) => e.id !== entryId);
      setEntries(remaining);
      if (selectedEntryId === entryId) {
        setSelectedEntryId(remaining.length > 0 ? remaining[0].id : null);
      }
    } catch (err: any) {
      console.error('Delete entry error:', err);
      setSaveError(`Could not delete reflection from Firestore: ${extractFirestoreErrorMessage(err)}`);
    }
  };

  // Active selected entry - fallback safely so user is never stranded on "No reflection selected" when entries exist
  const selectedEntry = useMemo(() => {
    if (entries.length === 0) return null;
    const found = entries.find((e) => e.id === selectedEntryId);
    return found || entries[0];
  }, [entries, selectedEntryId]);

  const locationCount = useMemo(() => {
    return entries.filter((e) => e.location && typeof e.location.lat === 'number').length;
  }, [entries]);

  // Keep selectedEntryId in sync with selectedEntry
  useEffect(() => {
    if (selectedEntry && selectedEntry.id !== selectedEntryId) {
      setSelectedEntryId(selectedEntry.id);
    }
  }, [selectedEntry, selectedEntryId]);

  // Auto-scaffold first entry if list is empty after loading
  useEffect(() => {
    if (user && !isLoadingEntries && entries.length === 0) {
      handleNewEntry();
    }
  }, [user, isLoadingEntries, entries.length, handleNewEntry]);

  if (isAuthLoading && !user) {
    return (
      <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center text-stone-300">
        <div className="w-10 h-10 rounded-full border-2 border-stone-800 border-t-amber-400 animate-spin mb-4" />
        <p className="text-sm font-serif text-stone-400">Loading Reflections Journal...</p>
      </div>
    );
  }

  return (
    <div className="h-dvh bg-stone-950 text-stone-100 flex flex-col selection:bg-amber-500/30 overflow-hidden">
      <Navbar
        user={user}
        onNewEntry={handleNewEntry}
        onSignOut={handleSignOut}
        onSignIn={handleSignIn}
        isSaving={isSaving}
        saveError={saveError}
        onRetrySave={handleRetrySave}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        entryCount={entries.length}
        locationCount={locationCount}
        activeView={activeView}
        onViewChange={setActiveView}
      />

      {!user ? (
        <LandingView
          onSignIn={handleSignIn}
          isLoading={isAuthLoading}
          errorMessage={authError}
          onClearError={() => setAuthError(null)}
        />
      ) : activeView === 'map' ? (
        <JourneyMapView
          entries={entries}
          activeEntryId={selectedEntryId}
          onSelectEntry={(id) => {
            setSelectedEntryId(id);
            setActiveView('journal');
          }}
          onUpdateEntry={handleUpdateEntry}
          onCreateEntry={handleCreateEntryWithLocation}
          onAddSampleEntry={handleAddSampleEntry}
        />
      ) : activeView === 'admin' ? (
        <AdminDashboard
          currentUser={user}
          entries={entries}
          onReturnToJournal={() => setActiveView('journal')}
        />
      ) : (
        <div className="flex-1 flex overflow-hidden relative">
          {/* Backdrop for mobile and tablet drawer */}
          {isSidebarOpen && (
            <div
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-stone-950/75 backdrop-blur-xs z-30 lg:hidden transition-opacity"
              aria-label="Close sidebar backdrop"
            />
          )}

          {/* Desktop static sidebar & Mobile/Tablet slide-over drawer */}
          <div
            className={`fixed inset-y-0 left-0 z-40 w-[85vw] max-w-xs sm:w-80 h-full shadow-2xl transition-transform duration-300 ease-in-out lg:static lg:z-auto lg:shadow-none lg:transition-[width] lg:duration-200 ${
              isSidebarOpen
                ? 'translate-x-0 lg:w-80 xl:w-88'
                : '-translate-x-full lg:w-0 lg:overflow-hidden lg:border-none'
            }`}
          >
            <EntryHistorySidebar
              entries={entries}
              selectedEntryId={selectedEntryId}
              onSelectEntry={(id) => {
                setSelectedEntryId(id);
                if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                  setIsSidebarOpen(false);
                }
              }}
              onNewEntry={() => {
                handleNewEntry();
                if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                  setIsSidebarOpen(false);
                }
              }}
              onDeleteEntry={handleDeleteEntry}
              isLoading={isLoadingEntries}
              onClose={() => setIsSidebarOpen(false)}
            />
          </div>

          {/* Main Reflection Editor Area */}
          <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
            {selectedEntry ? (
              <EntryEditor
                key={selectedEntry.id}
                entry={selectedEntry}
                user={user}
                onUpdateEntry={handleUpdateEntry}
                onDeleteEntry={handleDeleteEntry}
                isSaving={isSaving}
                saveError={saveError}
                onRetrySave={handleRetrySave}
                onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                isSidebarOpen={isSidebarOpen}
              />
            ) : isLoadingEntries ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-3 text-stone-400">
                <div className="w-8 h-8 rounded-full border-2 border-stone-800 border-t-amber-400 animate-spin" />
                <p className="text-xs font-serif text-stone-500">Opening your reflections...</p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 sm:p-8 space-y-4">
                <p className="text-stone-400 text-sm">No reflection selected</p>
                <button
                  id="btn-create-reflection-fallback"
                  onClick={handleNewEntry}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 text-sm font-medium rounded-xl shadow transition cursor-pointer"
                >
                  Create New Reflection
                </button>
              </div>
            )}
          </main>
        </div>
      )}
    </div>
  );
}
