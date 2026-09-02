import React, { useState } from 'react';
import { 
  Search, 
  Plus, 
  Trash2, 
  MessageSquare, 
  Sparkles,
  Filter,
  X
} from 'lucide-react';
import type { JournalEntry, EntryCategory } from '../types';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { CategoryDropdown } from './CategoryDropdown';

interface EntryHistorySidebarProps {
  entries: JournalEntry[];
  selectedEntryId: string | null;
  onSelectEntry: (entryId: string) => void;
  onNewEntry: () => void;
  onDeleteEntry: (entryId: string) => Promise<void>;
  isLoading?: boolean;
  onClose?: () => void;
}

const CATEGORY_LABELS: Record<EntryCategory, { label: string; color: string }> = {
  reflection: { label: 'Reflection', color: 'bg-amber-500/10 text-amber-300 border-amber-500/20' },
  gratitude: { label: 'Gratitude', color: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' },
  brainstorm: { label: 'Brainstorm', color: 'bg-blue-500/10 text-blue-300 border-blue-500/20' },
  daily_log: { label: 'Daily Log', color: 'bg-purple-500/10 text-purple-300 border-purple-500/20' },
  deep_thought: { label: 'Deep Thought', color: 'bg-rose-500/10 text-rose-300 border-rose-500/20' },
};

export const EntryHistorySidebar: React.FC<EntryHistorySidebarProps> = ({
  entries,
  selectedEntryId,
  onSelectEntry,
  onNewEntry,
  onDeleteEntry,
  isLoading,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [entryPendingDelete, setEntryPendingDelete] = useState<JournalEntry | null>(null);

  const filteredEntries = entries.filter((entry) => {
    const matchesSearch =
      entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.turns.some((t) => t.content.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (entry.summary && entry.summary.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory =
      selectedCategory === 'all' || entry.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const handleDeleteClick = (e: React.MouseEvent, entry: JournalEntry) => {
    e.stopPropagation();
    setEntryPendingDelete(entry);
  };

  const handleConfirmDelete = async () => {
    if (!entryPendingDelete) return;
    try {
      setDeletingId(entryPendingDelete.id);
      await onDeleteEntry(entryPendingDelete.id);
      setEntryPendingDelete(null);
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <aside className="w-full h-full flex flex-col border-r border-stone-800 bg-stone-900/95 backdrop-blur-md select-none">
      {/* Minimalist Header & Controls */}
      <div className="p-3 border-b border-stone-800 space-y-2 flex-shrink-0 bg-stone-900/40">
        {/* Row 1: Title, Count, New Entry Action & Close */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="text-xs font-semibold tracking-wider text-stone-300 uppercase truncate">
              Reflections
            </h2>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-stone-800 text-stone-400 font-mono border border-stone-700/60 flex-shrink-0">
              {entries.length}
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              id="btn-sidebar-new"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
                onNewEntry();
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-stone-950 font-medium text-xs rounded-lg shadow-sm transition active:scale-95 cursor-pointer"
              title="Create new reflection"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New</span>
            </button>

            {onClose && (
              <button
                onClick={onClose}
                className="p-1 min-h-[30px] min-w-[30px] flex items-center justify-center text-stone-400 hover:text-stone-100 hover:bg-stone-800 rounded-lg transition cursor-pointer"
                title="Close Sidebar"
                aria-label="Close Sidebar"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Streamlined Search & Category Select in a single compact row */}
        <div className="flex items-center gap-1.5">
          <div className="relative flex-1 flex items-center bg-stone-950/80 border border-stone-800 focus-within:border-amber-500/50 rounded-lg px-2 py-1 transition">
            <Search className="w-3.5 h-3.5 text-stone-500 mr-1.5 flex-shrink-0 pointer-events-none" />
            <input
              id="input-search-entries"
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-xs text-stone-200 placeholder-stone-500 focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="p-0.5 text-stone-500 hover:text-stone-300 rounded transition ml-1"
                title="Clear search"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Themed Category Selector Filter */}
          <div className="flex-shrink-0">
            <CategoryDropdown
              id="select-sidebar-category"
              value={selectedCategory as any}
              onChange={(newCat) => setSelectedCategory(newCat)}
              allowAll={true}
              align="right"
              size="sm"
            />
          </div>
        </div>
      </div>

      {/* Entry List */}
      <div className="flex-1 overflow-y-auto subtle-scrollbar divide-y divide-stone-800/60 p-2 space-y-1">
        {isLoading && entries.length === 0 ? (
          <div className="p-8 text-center text-stone-500 text-xs flex flex-col items-center gap-2">
            <span className="w-5 h-5 rounded-full border-2 border-stone-700 border-t-amber-400 animate-spin" />
            <span>Loading your entries from Firestore...</span>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-stone-800/80 mx-auto flex items-center justify-center text-stone-500">
              <Filter className="w-4 h-4" />
            </div>
            <p className="text-sm text-stone-300 font-medium">No reflections found</p>
            <p className="text-xs text-stone-500">
              {searchQuery || selectedCategory !== 'all'
                ? 'Try clearing your search query or filter'
                : 'Write your first reflection to begin!'}
            </p>
          </div>
        ) : (
          filteredEntries.map((entry) => {
            const isSelected = entry.id === selectedEntryId;
            const categoryMeta = CATEGORY_LABELS[entry.category] || CATEGORY_LABELS.reflection;
            const lastSnippet =
              entry.turns.length > 0
                ? entry.turns[entry.turns.length - 1].content
                : 'Unsaved draft (starts on first chat)...';

            return (
              <div
                key={entry.id}
                id={`entry-item-${entry.id}`}
                onClick={() => onSelectEntry(entry.id)}
                className={`group p-3 rounded-xl cursor-pointer transition border text-left relative min-h-[64px] ${
                  isSelected
                    ? 'bg-stone-800/95 border-amber-500/40 shadow-sm'
                    : 'bg-transparent border-transparent hover:bg-stone-800/40 hover:border-stone-800 active:bg-stone-800/60'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className={`text-xs sm:text-sm font-medium line-clamp-1 flex-1 ${
                    isSelected ? 'text-stone-100 font-semibold' : 'text-stone-300 group-hover:text-stone-100'
                  }`}>
                    {entry.title || 'Untitled Reflection'}
                  </h3>

                  <button
                    onClick={(e) => handleDeleteClick(e, entry)}
                    disabled={deletingId === entry.id}
                    title="Delete reflection"
                    aria-label={`Delete ${entry.title || 'reflection'}`}
                    className="opacity-70 sm:opacity-0 sm:group-hover:opacity-100 p-1.5 min-h-[32px] min-w-[32px] flex items-center justify-center text-stone-400 hover:text-red-400 hover:bg-red-950/40 rounded-lg transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <p className="text-xs text-stone-400 line-clamp-2 mt-1 leading-relaxed">
                  {lastSnippet}
                </p>

                <div className="flex items-center justify-between mt-2 pt-2 border-t border-stone-800/40 text-[11px] text-stone-400">
                  <div className="flex items-center gap-1.5">
                    <span className={`px-1.5 py-0.5 rounded border text-[10px] ${categoryMeta.color}`}>
                      {categoryMeta.label}
                    </span>
                    {entry.turns.length === 0 ? (
                      <span className="px-1.5 py-0.5 rounded border border-stone-700/60 bg-stone-800/60 text-stone-400 text-[10px]">
                        Draft
                      </span>
                    ) : null}
                    {entry.summary && (
                      <span className="flex items-center gap-0.5 text-amber-400 text-[10px]" title="Summary generated">
                        <Sparkles className="w-3 h-3" />
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-[10px] sm:text-[11px]">
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" />
                      {entry.turns.length}
                    </span>
                    <span>{formatDate(entry.updatedAt)}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* In-App Delete Confirmation Modal (avoids blocked iframe window.confirm) */}
      <DeleteConfirmModal
        isOpen={!!entryPendingDelete}
        title={entryPendingDelete?.title || 'Untitled Reflection'}
        onConfirm={handleConfirmDelete}
        onCancel={() => setEntryPendingDelete(null)}
        isDeleting={!!deletingId}
      />
    </aside>
  );
};

