import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { 
  Send, 
  Sparkles, 
  Lightbulb, 
  FileText, 
  Save, 
  Copy, 
  Check, 
  AlertCircle, 
  RefreshCw,
  User,
  Bot,
  Trash2,
  Pencil,
  Square,
  X,
  HelpCircle
} from 'lucide-react';
import type { JournalEntry, JournalTurn, EntryCategory, UserProfile } from '../types';
import { requestGeminiReflection } from '../lib/geminiApi';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { CategoryDropdown, CATEGORY_DEFINITIONS } from './CategoryDropdown';
import { CATEGORY_SHOWCASE_DATA } from '../data/categoryPrompts';

// Intelligently derive a clean, capitalized title from the first chat input
function generateTitleFromPrompt(prompt: string, category?: string): string {
  let cleaned = prompt
    .replace(/^#+\s*/, '')
    .replace(/^(i feel like|i feel|i am feeling|i want to reflect on|i am thinking about|today i|how can i|can you help me with|help me reflect on|what should i do about|reflecting on|thoughts on)\s+/i, '')
    .replace(/[\r\n]+/g, ' ')
    .trim();

  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return category ? `${category.charAt(0).toUpperCase() + category.slice(1)} Reflection` : 'Reflection';
  }

  const titleWords = words.slice(0, 6);
  let title = titleWords.join(' ');
  title = title.replace(/[,.;:?!-]+$/, '');

  if (title.length > 45) {
    title = title.slice(0, 42).replace(/\s+\S*$/, '') + '...';
  }

  return title
    .split(' ')
    .map((w) => (w.length > 0 ? w.charAt(0).toUpperCase() + w.slice(1) : ''))
    .join(' ');
}

interface EntryEditorProps {
  entry: JournalEntry;
  user?: UserProfile | null;
  onUpdateEntry: (updatedEntry: JournalEntry) => Promise<void>;
  onDeleteEntry?: (entryId: string) => Promise<void>;
  isSaving: boolean;
  saveError: string | null;
  onRetrySave: () => void;
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}

const CATEGORY_OPTIONS: { id: EntryCategory; label: string }[] = [
  { id: 'reflection', label: 'Reflection' },
  { id: 'daily_log', label: 'Daily Log' },
  { id: 'gratitude', label: 'Gratitude' },
  { id: 'brainstorm', label: 'Brainstorm' },
  { id: 'deep_thought', label: 'Deep Thought' },
];

const PROMPT_SUGGESTIONS = [
  "What is currently occupying the most space in your mind?",
  "Reflect on a decision you made recently: what led to it and how do you feel now?",
  "What is a subtle truth you noticed today that most people might miss?",
  "Describe a challenge you faced and 3 things you can learn from it.",
];

export const EntryEditor: React.FC<EntryEditorProps> = ({
  entry,
  user,
  onUpdateEntry,
  onDeleteEntry,
  isSaving,
  saveError,
  onRetrySave,
}) => {
  const [inputText, setInputText] = useState('');
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [generatingMode, setGeneratingMode] = useState<'chat' | 'brainstorm'>('chat');
  const [showModeHelp, setShowModeHelp] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [cancelNotice, setCancelNotice] = useState<string | null>(null);
  const [userImgError, setUserImgError] = useState(false);
  const [copiedTurnId, setCopiedTurnId] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const summaryAbortRef = useRef<AbortController | null>(null);
  const activeUserTurnIdRef = useRef<string | null>(null);
  const lastSubmittedPromptRef = useRef<string>('');

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entry.turns, isAiGenerating]);

  // Auto-grow textarea height smoothly based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.min(textareaRef.current.scrollHeight, 120);
      textareaRef.current.style.height = `${Math.max(newHeight, 36)}px`;
    }
  }, [inputText]);

  // Cleanup any ongoing generation on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (summaryAbortRef.current) {
        summaryAbortRef.current.abort();
      }
    };
  }, []);

  const handleCancelSummary = () => {
    if (summaryAbortRef.current) {
      summaryAbortRef.current.abort();
      summaryAbortRef.current = null;
    }
    setIsSummarizing(false);
  };

  const handleCancelGeneration = async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsAiGenerating(false);

    // Restore text back into textarea if user sent by mistake
    const textToRestore = lastSubmittedPromptRef.current;
    if (textToRestore) {
      setInputText(textToRestore);
    }

    // Revert the mistakenly sent user turn from the journal entry
    const turnIdToRemove = activeUserTurnIdRef.current;
    if (turnIdToRemove) {
      const remainingTurns = entry.turns.filter((t) => t.id !== turnIdToRemove);
      const revertedEntry: JournalEntry = {
        ...entry,
        turns: remainingTurns,
        updatedAt: Date.now(),
      };
      try {
        await onUpdateEntry(revertedEntry);
      } catch (err) {
        console.error('Failed to revert entry after cancelling reflection:', err);
      }
      activeUserTurnIdRef.current = null;
    }

    setCancelNotice('Reflection cancelled. Your text has been restored to the input.');
    setTimeout(() => setCancelNotice(null), 4000);
    textareaRef.current?.focus();
  };

  const handleTitleChange = async (newTitle: string) => {
    const updated: JournalEntry = {
      ...entry,
      title: newTitle,
      isUserCustomTitle: true,
      updatedAt: Date.now(),
    };
    await onUpdateEntry(updated);
  };

  const handleCategoryChange = async (newCategory: EntryCategory) => {
    const updated: JournalEntry = {
      ...entry,
      category: newCategory,
      updatedAt: Date.now(),
    };
    await onUpdateEntry(updated);
  };

  const handleSendPrompt = async (customMode: 'chat' | 'brainstorm' = 'chat') => {
    const promptToSend = inputText.trim();
    if (!promptToSend || isAiGenerating) return;

    const isFirstMessage = entry.turns.length === 0;
    const isTitleUnset = !entry.isUserCustomTitle && 
      (!entry.title || entry.title.trim() === 'New Reflection' || entry.title.trim() === 'Untitled Reflection');

    // If reflection name is not set by the user, immediately auto-set from the first chat context
    let activeTitle = entry.title;
    if (isFirstMessage && isTitleUnset) {
      activeTitle = generateTitleFromPrompt(promptToSend, entry.category);
    }

    setAiError(null);
    setCancelNotice(null);
    const userTurn: JournalTurn = {
      id: `turn-${Date.now()}-user`,
      role: 'user',
      content: promptToSend,
      timestamp: Date.now(),
    };

    // Optimistically update entry with user message and the auto-derived title
    const updatedWithUserTurn: JournalEntry = {
      ...entry,
      title: activeTitle,
      turns: [...entry.turns, userTurn],
      updatedAt: Date.now(),
    };

    // Persist user turn (this also triggers first save to Firestore)
    try {
      await onUpdateEntry(updatedWithUserTurn);
    } catch (err: any) {
      setAiError(`Failed to save reflection to Firestore: ${err?.message || 'Database error'}`);
      return; // Do not proceed or clear input if save fails
    }

    // Set up cancellation tracking
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    activeUserTurnIdRef.current = userTurn.id;
    lastSubmittedPromptRef.current = promptToSend;

    // Clear input buffer now that user message is securely saved
    setInputText('');
    setGeneratingMode(customMode);
    setIsAiGenerating(true);

    try {
      const aiResponse = await requestGeminiReflection({
        entryTitle: activeTitle,
        category: entry.category,
        history: updatedWithUserTurn.turns,
        prompt: promptToSend,
        mode: customMode,
        suggestTitle: isTitleUnset,
        signal: abortController.signal,
      });

      // If Gemini returned an enhanced contextual title and user hasn't overridden it, refine the title!
      let finalTitle = activeTitle;
      if (isTitleUnset && aiResponse.suggestedTitle && aiResponse.suggestedTitle.trim()) {
        finalTitle = aiResponse.suggestedTitle.trim();
      }

      const assistantTurn: JournalTurn = {
        id: `turn-${Date.now()}-assistant`,
        role: 'assistant',
        content: aiResponse.text,
        timestamp: Date.now(),
        modelUsed: aiResponse.modelUsed,
        mode: customMode,
      };

      const finalUpdatedEntry: JournalEntry = {
        ...updatedWithUserTurn,
        title: finalTitle,
        turns: [...updatedWithUserTurn.turns, assistantTurn],
        updatedAt: Date.now(),
      };

      await onUpdateEntry(finalUpdatedEntry);
    } catch (err: any) {
      if (err.name === 'AbortError' || abortController.signal.aborted) {
        console.log('Gemini reflection request cancelled by user');
        return;
      }
      console.error('Error generating AI reflection:', err);
      setAiError(err?.message || 'Gemini could not respond. Please try again.');
      setInputText(promptToSend);
    } finally {
      abortControllerRef.current = null;
      activeUserTurnIdRef.current = null;
      setIsAiGenerating(false);
    }
  };

  const handleGenerateSummary = async () => {
    if (entry.turns.length === 0 || isSummarizing) return;

    setIsSummarizing(true);
    setAiError(null);

    const abort = new AbortController();
    summaryAbortRef.current = abort;

    try {
      const summaryResult = await requestGeminiReflection({
        entryTitle: entry.title,
        category: entry.category,
        history: entry.turns,
        mode: 'summarize',
        signal: abort.signal,
      });

      const updatedEntry: JournalEntry = {
        ...entry,
        summary: summaryResult.text,
        summaryModel: summaryResult.modelUsed,
        updatedAt: Date.now(),
      };

      await onUpdateEntry(updatedEntry);
      setShowSummaryModal(true);
    } catch (err: any) {
      if (err.name === 'AbortError' || abort.signal.aborted) {
        console.log('Summary generation aborted by user');
        return;
      }
      setAiError(err?.message || 'Failed to generate summary with Gemini.');
    } finally {
      summaryAbortRef.current = null;
      setIsSummarizing(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!onDeleteEntry) return;
    try {
      setIsDeleting(true);
      await onDeleteEntry(entry.id);
      setShowDeleteModal(false);
    } catch (err: any) {
      setAiError(`Failed to delete reflection: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCopyText = async (turnId: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedTurnId(turnId);
      setTimeout(() => setCopiedTurnId(null), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape' && isAiGenerating) {
      e.preventDefault();
      handleCancelGeneration();
      return;
    }
    if ((e.key === 'Enter' && !e.shiftKey) || ((e.metaKey || e.ctrlKey) && e.key === 'Enter')) {
      e.preventDefault();
      handleSendPrompt('chat');
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-stone-950 text-stone-100 overflow-hidden relative">
      {/* Sleek, Space-Efficient Top Header (Single Row) */}
      <div className="px-3 sm:px-5 py-2 sm:py-2.5 border-b border-stone-800 bg-stone-900/90 backdrop-blur-md flex items-center justify-between gap-2 sm:gap-4 flex-shrink-0">
        {/* Left: Title & Category Pill */}
        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
          <div className="relative flex-1 flex items-center min-w-0 group/title">
            <input
              id="input-entry-title"
              type="text"
              value={entry.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder={
                !entry.isUserCustomTitle && entry.turns.length === 0
                  ? "Name reflection (or send a message to auto-title)..."
                  : "Name your reflection..."
              }
              title="Click to rename reflection"
              className="w-full text-sm sm:text-base md:text-lg font-serif font-medium bg-transparent border-b border-transparent hover:border-stone-700/70 focus:border-amber-500/60 text-stone-100 placeholder-stone-600 focus:outline-none focus:ring-0 truncate pr-6 transition py-0.5"
            />
            <Pencil className="w-3 h-3 text-stone-500 opacity-0 group-hover/title:opacity-80 transition absolute right-1 pointer-events-none" />
          </div>

          {!entry.isUserCustomTitle && entry.turns.length === 0 && (
            <span 
              className="hidden xl:inline-flex items-center gap-1 text-[10px] text-amber-400/80 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded flex-shrink-0"
              title="If not manually named, title will be auto-generated from your first message"
            >
              <Sparkles className="w-2.5 h-2.5" />
              Auto-titles on chat
            </span>
          )}

          <CategoryDropdown
            id="select-entry-category"
            value={entry.category}
            onChange={(newCat: EntryCategory) => handleCategoryChange(newCat)}
            align="left"
            size="sm"
          />
        </div>

        {/* Right: Actions (Summary, Delete, Sync) */}
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          {entry.summary ? (
            <button
              id="btn-view-summary"
              onClick={() => setShowSummaryModal(true)}
              className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] sm:text-xs font-medium rounded-lg transition min-h-[30px] cursor-pointer"
              title="View Gemini Executive Summary"
            >
              <FileText className="w-3.5 h-3.5 text-amber-400" />
              <span>Summary</span>
            </button>
          ) : (
            <button
              id="btn-generate-summary"
              onClick={isSummarizing ? handleCancelSummary : handleGenerateSummary}
              disabled={entry.turns.length === 0}
              className={`inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 text-[11px] sm:text-xs font-medium rounded-lg transition min-h-[30px] cursor-pointer ${
                isSummarizing
                  ? 'bg-red-950/50 hover:bg-red-900/70 text-red-300 border border-red-500/40 shadow-xs'
                  : 'bg-stone-800 hover:bg-stone-700 text-stone-300 disabled:opacity-40 disabled:cursor-not-allowed'
              }`}
              title={isSummarizing ? 'Click to cancel summary generation' : (entry.turns.length === 0 ? 'Write some reflections first' : 'Summarize with Gemini')}
            >
              {isSummarizing ? (
                <>
                  <Square className="w-3 h-3 fill-current text-red-400" />
                  <span>Cancel</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden xs:inline">Summarize</span>
                </>
              )}
            </button>
          )}

          {onDeleteEntry && (
            <button
              id="btn-delete-reflection"
              onClick={() => setShowDeleteModal(true)}
              className="p-1 sm:p-1.5 min-h-[30px] min-w-[30px] flex items-center justify-center text-stone-400 hover:text-red-400 hover:bg-red-950/40 rounded-lg transition cursor-pointer"
              title="Delete this reflection"
              aria-label="Delete this reflection"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          <div className="text-[11px] text-stone-400 flex items-center gap-1 pl-1 sm:pl-1.5 border-l border-stone-800">
            {entry.turns.length === 0 ? (
              <span
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-stone-800/80 border border-stone-700/60 text-stone-400 text-[10px]"
                title="Chat not started yet — not stored into database until first message is sent"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-stone-500" />
                <span className="hidden sm:inline">Draft (Not in DB)</span>
                <span className="sm:hidden">Draft</span>
              </span>
            ) : (
              <div className="flex items-center gap-1 text-stone-400">
                <Save className="w-3 h-3 text-stone-400" />
                <span className="hidden md:inline">
                  {isSaving ? 'Saving...' : 'Synced'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Error Banners */}
      {saveError && (
        <div className="bg-red-950/90 border-b border-red-800 px-3 sm:px-4 py-1.5 flex items-center justify-between text-xs text-red-200 flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span className="truncate">Firestore save error: {saveError}</span>
          </div>
          <button
            onClick={onRetrySave}
            className="px-2 py-0.5 bg-red-900 hover:bg-red-800 rounded font-medium text-red-100 transition flex-shrink-0 ml-2 cursor-pointer text-[11px]"
          >
            Retry
          </button>
        </div>
      )}

      {aiError && (
        <div className="bg-amber-950/90 border-b border-amber-800 px-3 sm:px-4 py-1.5 flex items-center justify-between text-xs text-amber-200 flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span className="truncate">Gemini AI: {aiError}</span>
          </div>
          <button
            onClick={() => setAiError(null)}
            className="text-amber-400 hover:underline flex-shrink-0 ml-2 cursor-pointer text-[11px]"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Compact Slim Summary Strip (Takes only ~32px, doesn't squeeze chat!) */}
      {entry.summary && (
        <div className="mx-3 sm:mx-5 mt-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-stone-300 text-xs flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2 truncate">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
            <span className="text-amber-300 font-medium text-[11px] sm:text-xs">Summary ready</span>
            <span className="text-stone-400 text-[11px] truncate hidden sm:inline">{entry.summary.slice(0, 90)}...</span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
            <button
              onClick={() => setShowSummaryModal(true)}
              className="text-[11px] text-amber-400 hover:text-amber-300 font-medium underline cursor-pointer"
            >
              View Full
            </button>
            <button
              onClick={handleGenerateSummary}
              disabled={isSummarizing}
              className="text-stone-400 hover:text-amber-300 transition flex items-center gap-1 text-[11px] cursor-pointer ml-1"
              title="Regenerate summary"
            >
              <RefreshCw className={`w-3 h-3 ${isSummarizing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      )}

      {/* Main Conversation / Journal Turns Timeline (Maximum Height & Visibility) */}
      <div className="flex-1 overflow-y-auto subtle-scrollbar px-3 py-4 sm:px-6 sm:py-5 lg:px-8 space-y-3.5 sm:space-y-4">
        {entry.turns.length === 0 ? (
          (() => {
            const currentCatMeta = CATEGORY_DEFINITIONS[entry.category] || CATEGORY_DEFINITIONS.reflection;
            const currentCatShowcase = CATEGORY_SHOWCASE_DATA[entry.category] || CATEGORY_SHOWCASE_DATA.reflection;
            const CatIcon = currentCatMeta.icon;

            return (
              <div className="h-full flex flex-col items-center justify-center text-center max-w-xl mx-auto space-y-4 sm:space-y-5 py-6 sm:py-8">
                <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl ${currentCatMeta.bgLight} border ${currentCatMeta.borderActive} flex items-center justify-center flex-shrink-0 shadow-lg`}>
                  <CatIcon className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>
                <div className="space-y-1.5">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-medium mb-1">
                    <span className={currentCatMeta.textColor}>{currentCatMeta.label}</span>
                    <span className="text-stone-500">•</span>
                    <span className="text-stone-400">{currentCatMeta.description}</span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-serif text-stone-100">
                    {entry.category === 'brainstorm'
                      ? 'Brainstorm with 3 Perspectives'
                      : entry.category === 'gratitude'
                      ? 'Ground in What You Appreciate'
                      : entry.category === 'daily_log'
                      ? 'Document Your Day'
                      : entry.category === 'deep_thought'
                      ? 'Explore a Foundational Question'
                      : 'Begin Your Reflection'}
                  </h3>
                  <p className="text-stone-400 text-xs sm:text-sm leading-relaxed px-2">
                    {entry.category === 'brainstorm'
                      ? 'Share a dilemma, idea, or block. Click "Brainstorm (3 Angles)" for Philosophical, Pragmatic, and Contrarian views.'
                      : 'Write freely about your day, goals, challenges, or thoughts. Gemini will listen and reflect with you.'}
                  </p>
                </div>

                <div className="w-full space-y-2 pt-2 text-left">
                  <span className="text-[11px] text-stone-400 uppercase tracking-wider font-semibold block text-center">
                    Inspiration Starters for {currentCatMeta.label}
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {currentCatShowcase.prompts.map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setInputText(suggestion);
                          textareaRef.current?.focus();
                        }}
                        className="p-2.5 text-left text-xs bg-stone-900/70 hover:bg-stone-800/90 border border-stone-800 hover:border-amber-500/30 rounded-xl text-stone-300 hover:text-stone-100 transition cursor-pointer min-h-[42px] group flex items-start gap-1.5"
                      >
                        <span className="text-stone-500 group-hover:text-amber-400 font-mono text-[10px] mt-0.5">›</span>
                        <span className="leading-snug">"{suggestion}"</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()
        ) : (
          <div className="max-w-4xl mx-auto w-full space-y-3.5 sm:space-y-4 pb-2">
            {entry.turns.map((turn) => {
              const isUser = turn.role === 'user';
              return (
                <div
                  key={turn.id}
                  className={`flex gap-2 sm:gap-3 w-full ${
                    isUser ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {!isUser && (
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 flex-shrink-0 mt-0.5">
                      <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </div>
                  )}

                  <div
                    className={`rounded-2xl p-3 sm:p-4 transition text-xs sm:text-sm leading-relaxed max-w-[92%] sm:max-w-[85%] md:max-w-[80%] ${
                      isUser
                        ? 'bg-stone-800/90 text-stone-100 rounded-tr-xs border border-stone-700/60 shadow-sm ml-auto'
                        : 'bg-stone-900/90 text-stone-200 rounded-tl-xs border border-stone-800/90 shadow-sm mr-auto'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 mb-1.5 text-xs text-stone-400">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-medium text-stone-300 truncate">
                          {isUser ? (user?.displayName || 'You') : 'Gemini Reflection'}
                        </span>
                        {!isUser && (
                          <>
                            {turn.mode === 'brainstorm' && (
                              <span className="px-1.5 py-0.5 rounded bg-sky-500/15 border border-sky-500/30 text-sky-300 font-medium text-[10px] inline-flex items-center gap-1">
                                <Lightbulb className="w-2.5 h-2.5 text-sky-400" />
                                3 Angles
                              </span>
                            )}
                            <span className="px-1.5 py-0.2 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300 font-mono text-[10px] hidden xs:inline">
                              {turn.modelUsed || 'gemini-3.1-flash-lite'}
                            </span>
                          </>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className="text-[10px] text-stone-400">
                          {new Date(turn.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        <button
                          onClick={() => handleCopyText(turn.id, turn.content)}
                          className="p-1 min-h-[26px] min-w-[26px] flex items-center justify-center text-stone-400 hover:text-stone-300 transition cursor-pointer"
                          title="Copy text"
                          aria-label="Copy message text"
                        >
                          {copiedTurnId === turn.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Message Content with refined typography */}
                    <div className="prose prose-invert prose-stone max-w-none text-stone-200 text-xs sm:text-sm break-words leading-relaxed prose-p:my-1.5 prose-headings:my-2 prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5 prose-blockquote:border-l-amber-500/60 prose-blockquote:text-stone-300 prose-blockquote:my-2">
                      <ReactMarkdown>{turn.content}</ReactMarkdown>
                    </div>
                  </div>

                  {isUser && (
                    user?.photoURL && !userImgError ? (
                      <img
                        src={user.photoURL}
                        alt={user?.displayName || 'You'}
                        onError={() => setUserImgError(true)}
                        referrerPolicy="no-referrer"
                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg object-cover border border-stone-700/80 flex-shrink-0 mt-0.5 shadow-xs"
                      />
                    ) : (
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-stone-800 border border-stone-700 flex items-center justify-center text-stone-300 flex-shrink-0 mt-0.5">
                        <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </div>
                    )
                  )}
                </div>
              );
            })}
          </div>
        )}

        {isAiGenerating && (
          <div className="max-w-4xl mx-auto w-full flex items-center justify-between gap-2 sm:gap-3 py-1">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg ${generatingMode === 'brainstorm' ? 'bg-sky-500/10 border-sky-500/20 text-sky-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'} border flex items-center justify-center flex-shrink-0 mt-0.5 animate-pulse`}>
                {generatingMode === 'brainstorm' ? (
                  <Lightbulb className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                )}
              </div>
              <div className="rounded-2xl rounded-tl-xs p-2.5 sm:p-3 bg-stone-900/90 border border-stone-800 text-stone-300 text-xs flex items-center gap-2.5 shadow-sm">
                <span className={`w-2 h-2 rounded-full ${generatingMode === 'brainstorm' ? 'bg-sky-400' : 'bg-amber-400'} animate-ping`} />
                <span className="truncate">
                  {generatingMode === 'brainstorm'
                    ? 'Gemini is exploring 3 angles (Philosophical, Pragmatic, Contrarian)...'
                    : 'Gemini is reflecting on your thoughts...'}
                </span>
              </div>
            </div>
            <button
              id="btn-cancel-generation-pill"
              type="button"
              onClick={handleCancelGeneration}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-300 hover:text-red-100 bg-red-950/50 hover:bg-red-900/70 border border-red-500/40 hover:border-red-500/60 rounded-xl transition cursor-pointer flex-shrink-0 shadow-sm active:scale-95"
              title="Cancel reflection (Sent by mistake? Click to stop and restore)"
            >
              <Square className="w-3 h-3 fill-current text-red-400" />
              <span>Cancel</span>
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Minimalist, Sleek Chat Input Bar (Single Capsule Layout) */}
      <div className="px-3 sm:px-6 py-2 sm:py-2.5 border-t border-stone-800/80 bg-stone-900/90 backdrop-blur-md flex-shrink-0">
        <div className="max-w-4xl mx-auto">
          {cancelNotice && (
            <div className="mb-2 flex items-center justify-between gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/25 rounded-xl text-xs text-amber-300">
              <span className="truncate">{cancelNotice}</span>
              <button
                type="button"
                onClick={() => setCancelNotice(null)}
                className="text-stone-400 hover:text-stone-200 p-0.5 rounded cursor-pointer flex-shrink-0"
                title="Dismiss"
                aria-label="Dismiss cancellation notice"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Educational Mode Explainer (Send vs Brainstorm) */}
          {showModeHelp && (
            <div className="mb-2.5 p-3 rounded-xl bg-stone-900 border border-stone-700/80 shadow-lg text-xs space-y-2 relative">
              <div className="flex items-center justify-between pb-1.5 border-b border-stone-800">
                <span className="font-medium text-stone-200 flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                  Send vs. Brainstorm: Two ways to interact
                </span>
                <button
                  type="button"
                  onClick={() => setShowModeHelp(false)}
                  className="text-stone-400 hover:text-stone-200 p-0.5 rounded cursor-pointer"
                  aria-label="Close guide"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-stone-300">
                <div className="p-2 rounded-lg bg-stone-950/60 border border-stone-800 space-y-1">
                  <div className="flex items-center gap-1.5 text-amber-300 font-medium text-xs">
                    <Send className="w-3 h-3 text-amber-400" />
                    <span>Send (Enter) — Empathetic Reflection</span>
                  </div>
                  <p className="text-[11px] text-stone-400 leading-relaxed">
                    Acts as an empathetic conversational partner. Validates your feelings and asks gentle questions to deepen self-awareness.
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-sky-950/30 border border-sky-800/40 space-y-1">
                  <div className="flex items-center gap-1.5 text-sky-300 font-medium text-xs">
                    <Lightbulb className="w-3 h-3 text-sky-400" />
                    <span>Brainstorm (3 Angles) — Perspective Shift</span>
                  </div>
                  <p className="text-[11px] text-stone-400 leading-relaxed">
                    Breaks your thought into 3 lenses: <b>Philosophical</b> (core values), <b>Pragmatic</b> (immediate steps), and <b>Contrarian</b> (challenge assumptions).
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="relative flex items-end gap-1.5 sm:gap-2 bg-stone-950 border border-stone-800 focus-within:border-amber-500/50 rounded-2xl p-1.5 sm:p-2 transition shadow-inner">
            {/* Brainstorm Angles Button */}
            <button
              id="btn-brainstorm-mode"
              type="button"
              onClick={() => handleSendPrompt('brainstorm')}
              disabled={!inputText.trim() || isAiGenerating}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-sky-300 bg-sky-950/40 hover:bg-sky-900/60 border border-sky-500/30 hover:border-sky-400/50 rounded-xl transition disabled:opacity-30 disabled:hover:bg-sky-950/40 cursor-pointer flex-shrink-0 text-xs min-h-[34px] shadow-xs active:scale-95"
              title="Brainstorm 3 Angles (Philosophical, Pragmatic, Contrarian) on your thought"
              aria-label="Brainstorm 3 angles"
            >
              <Lightbulb className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
              <span className="hidden sm:inline font-medium text-[11px]">Brainstorm (3 Angles)</span>
              <span className="sm:hidden font-medium text-[11px]">3 Angles</span>
            </button>

            {/* Mode Guide Info Button */}
            <button
              type="button"
              onClick={() => setShowModeHelp(!showModeHelp)}
              className="p-1 text-stone-400 hover:text-stone-200 transition cursor-pointer rounded-lg hover:bg-stone-900 flex-shrink-0 self-center hidden xs:inline-flex"
              title="What is the difference between Send and Brainstorm?"
              aria-label="Explain Send vs Brainstorm"
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>

            {/* Auto-growing Textarea (Enter to send, Shift+Enter for new line) */}
            <textarea
              id="input-journal-thought"
              ref={textareaRef}
              rows={1}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Reflect on your thoughts... (Enter to Reflect, or click Brainstorm for 3 angles)"
              className="flex-1 min-h-[34px] max-h-[120px] py-1.5 px-2 bg-transparent border-none text-stone-100 placeholder-stone-500 text-xs sm:text-sm resize-none focus:outline-none focus:ring-0 leading-relaxed subtle-scrollbar"
            />

            {/* Send or Cancel Button */}
            {isAiGenerating ? (
              <button
                id="btn-cancel-generation-bar"
                type="button"
                onClick={handleCancelGeneration}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[34px] bg-red-500/20 hover:bg-red-500/30 text-red-300 hover:text-red-200 border border-red-500/40 rounded-xl text-xs font-medium transition cursor-pointer flex-shrink-0 active:scale-95 shadow-sm"
                title="Cancel reflection & restore text (Esc)"
                aria-label="Cancel reflection"
              >
                <Square className="w-3.5 h-3.5 fill-current text-red-400" />
                <span className="text-[11px] font-medium">Cancel</span>
              </button>
            ) : (
              <button
                id="btn-send-thought"
                type="button"
                onClick={() => handleSendPrompt('chat')}
                disabled={!inputText.trim()}
                className="p-2 min-h-[34px] min-w-[34px] flex items-center justify-center bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-xl transition shadow-sm disabled:opacity-30 disabled:hover:bg-amber-500 disabled:cursor-not-allowed cursor-pointer flex-shrink-0 active:scale-95"
                title="Send reflection (Enter)"
                aria-label="Send reflection"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Structured Summary Modal */}
      {showSummaryModal && entry.summary && (
        <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl max-w-2xl w-full max-h-[85dvh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-stone-800 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
                <h3 className="font-serif text-base sm:text-lg font-medium text-stone-100">
                  Reflection Summary & Insights
                </h3>
              </div>
              <button
                onClick={() => setShowSummaryModal(false)}
                className="p-1.5 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition cursor-pointer"
                aria-label="Close Summary Modal"
              >
                ✕
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto subtle-scrollbar space-y-4 text-stone-200 text-xs sm:text-sm prose prose-invert prose-stone max-w-none leading-relaxed">
              <ReactMarkdown>{entry.summary}</ReactMarkdown>
            </div>

            <div className="p-3 sm:p-4 border-t border-stone-800 bg-stone-950/40 flex items-center justify-between flex-shrink-0 text-xs">
              <span className="text-stone-400 font-mono text-[11px]">
                {entry.summaryModel || 'gemini-3.6-flash'}
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(entry.summary || '');
                  setShowSummaryModal(false);
                }}
                className="px-3.5 py-1.5 sm:px-4 sm:py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium rounded-lg transition min-h-[36px] cursor-pointer"
              >
                Copy & Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal for the current reflection */}
      <DeleteConfirmModal
        isOpen={showDeleteModal}
        title={entry.title || 'Untitled Reflection'}
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowDeleteModal(false)}
        isDeleting={isDeleting}
      />
    </div>
  );
};
