import React, { useState } from 'react';
import { 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  Lightbulb, 
  ShieldCheck, 
  Database, 
  ChevronRight,
  MessageSquare,
  Lock,
  Zap,
  Tag
} from 'lucide-react';
import { CATEGORY_DEFINITIONS, ALL_CATEGORIES } from './CategoryDropdown';
import { CATEGORY_SHOWCASE_DATA } from '../data/categoryPrompts';
import type { EntryCategory } from '../types';

interface LandingViewProps {
  onSignIn: () => void;
  isLoading?: boolean;
  errorMessage?: string | null;
  onClearError?: () => void;
}

export const LandingView: React.FC<LandingViewProps> = ({
  onSignIn,
  isLoading,
  errorMessage,
  onClearError,
}) => {
  const [activeCategory, setActiveCategory] = useState<EntryCategory>('reflection');
  const [activePromptIndex, setActivePromptIndex] = useState<number>(0);

  const currentCategoryMeta = CATEGORY_DEFINITIONS[activeCategory];
  const currentShowcase = CATEGORY_SHOWCASE_DATA[activeCategory];

  return (
    <div className="min-h-[calc(100dvh-3.5rem)] sm:min-h-[calc(100dvh-4rem)] flex-1 overflow-y-auto subtle-scrollbar bg-stone-950 text-stone-100 selection:bg-amber-500/30">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-14 space-y-12 sm:space-y-16">
        
        {/* Top Hero Section */}
        <div className="max-w-3xl mx-auto text-center space-y-5 sm:space-y-6">
          {/* Subtle Model Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-stone-900/90 border border-stone-800 text-stone-300 text-xs font-medium shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 animate-pulse" />
            <span className="truncate">Multi-Turn Journaling Powered by Gemini AI</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
            <span className="text-[10px] text-stone-400 uppercase tracking-wider font-mono">Firestore Connected</span>
          </div>

          {/* Editorial Display Heading */}
          <div className="space-y-3 sm:space-y-4">
            <h1 className="text-3xl xs:text-4xl sm:text-5xl lg:text-6xl font-serif tracking-tight text-stone-100 leading-[1.15]">
              A private sanctuary for your <span className="italic text-amber-400">deepest reflections</span>.
            </h1>
            <p className="text-stone-400 text-sm sm:text-base lg:text-lg max-w-2xl mx-auto leading-relaxed font-normal">
              Capture your inner dialogue, explore challenges from 3 distinct angles, and reflect with a thoughtful AI companion. Every entry is strictly isolated to your authenticated account in Cloud Firestore.
            </p>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3.5 sm:p-4 rounded-xl bg-red-950/70 border border-red-800 text-red-200 text-xs sm:text-sm max-w-md mx-auto text-left flex items-start justify-between gap-3 shadow-md">
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="p-1 rounded bg-red-900/60 text-red-300 flex-shrink-0 text-xs font-bold leading-none">!</div>
                <div className="min-w-0">
                  <p className="font-medium text-red-100">Sign-in Notice</p>
                  <p className="text-xs text-red-300/90 mt-0.5 break-words">{errorMessage}</p>
                </div>
              </div>
              {onClearError && (
                <button
                  type="button"
                  onClick={onClearError}
                  className="text-red-400 hover:text-red-200 p-1 rounded-md hover:bg-red-900/50 transition cursor-pointer flex-shrink-0"
                  title="Dismiss notice"
                  aria-label="Dismiss notice"
                >
                  ✕
                </button>
              )}
            </div>
          )}

          {/* Primary Call to Action */}
          <div className="pt-2 flex flex-col items-center justify-center gap-3">
            <button
              id="btn-google-signin"
              onClick={onSignIn}
              disabled={isLoading}
              className="w-full xs:w-auto min-w-[260px] sm:min-w-[280px] inline-flex items-center justify-center gap-3 px-6 py-3.5 bg-amber-400 hover:bg-amber-300 text-stone-950 font-semibold text-sm sm:text-base rounded-2xl shadow-lg shadow-amber-500/10 hover:shadow-amber-500/20 transition-all duration-200 transform active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer min-h-[50px]"
            >
              {isLoading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full border-2 border-stone-950 border-t-transparent animate-spin" />
                  Connecting securely...
                </span>
              ) : (
                <>
                  <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                  <ArrowRight className="w-4 h-4 text-stone-900" />
                </>
              )}
            </button>
            <p className="text-xs text-stone-400 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Google Federated Auth • Private Firestore Database • Zero Passwords Stored</span>
            </p>
          </div>
        </div>

        {/* Catchy Category & Live Interactive Interface Showcase */}
        <div className="space-y-6">
          <div className="text-center space-y-2 max-w-xl mx-auto">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-stone-900 border border-stone-800 text-[11px] text-stone-300 font-medium">
              <Tag className="w-3 h-3 text-amber-400" />
              <span>Catchy Category Interface</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-serif text-stone-100">
              Interactive Journaling Lenses
            </h2>
            <p className="text-xs sm:text-sm text-stone-400">
              Select a category below to test how Gemini tailors its thinking model, empathetic reflections, or 3-angle brainstorming.
            </p>
          </div>

          {/* Category Tabs Switcher */}
          <div className="flex flex-wrap items-center justify-center gap-2 max-w-3xl mx-auto p-1.5 rounded-2xl bg-stone-900/60 border border-stone-800/80">
            {ALL_CATEGORIES.map((catId) => {
              const meta = CATEGORY_DEFINITIONS[catId];
              const isSelected = activeCategory === catId;
              const Icon = meta.icon;

              return (
                <button
                  key={catId}
                  id={`tab-category-${catId}`}
                  onClick={() => {
                    setActiveCategory(catId);
                    setActivePromptIndex(0);
                  }}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all duration-150 cursor-pointer select-none ${
                    isSelected
                      ? `${meta.badgeColor} ring-1 ${meta.borderActive} shadow-sm font-semibold scale-102`
                      : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{meta.label}</span>
                </button>
              );
            })}
          </div>

          {/* Interactive Live Mockup Card */}
          <div className="max-w-4xl mx-auto rounded-3xl bg-stone-900/40 border border-stone-800 shadow-2xl overflow-hidden backdrop-blur-xs">
            {/* Mock Header */}
            <div className="px-4 sm:px-6 py-3.5 border-b border-stone-800/80 bg-stone-900/70 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-serif font-medium text-stone-200 text-sm">
                  {currentCategoryMeta.label} Session Preview
                </span>
                <span className={`px-2 py-0.5 rounded-md border text-[11px] font-medium inline-flex items-center gap-1 ${currentCategoryMeta.badgeColor}`}>
                  <currentCategoryMeta.icon className="w-3 h-3" />
                  {currentCategoryMeta.label}
                </span>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-stone-400">
                <span className="px-2 py-0.5 rounded bg-stone-800 border border-stone-700 font-mono text-[10px] text-stone-300">
                  gemini-3.1-flash-lite
                </span>
                <span className="hidden sm:inline">•</span>
                <span className="hidden sm:inline">Owner-Bound Firestore</span>
              </div>
            </div>

            {/* Mock Chat Canvas */}
            <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 bg-stone-950/60 min-h-[300px] flex flex-col justify-center">
              {/* User Thought Turn */}
              <div className="flex items-start justify-end gap-2.5 sm:gap-3 max-w-2xl ml-auto">
                <div className="rounded-2xl rounded-tr-xs p-3.5 sm:p-4 bg-stone-800/90 border border-stone-700/60 text-stone-200 text-xs sm:text-sm leading-relaxed shadow-sm">
                  <p className="text-stone-100">{currentShowcase.samplePrompt}</p>
                  <span className="block text-[10px] text-stone-400 mt-1.5 text-right font-mono">Today • You</span>
                </div>
                <div className="w-8 h-8 rounded-lg bg-stone-800 border border-stone-700 flex items-center justify-center text-stone-300 flex-shrink-0 text-xs font-semibold">
                  You
                </div>
              </div>

              {/* Gemini Response Turn */}
              <div className="flex items-start gap-2.5 sm:gap-3 max-w-2xl mr-auto">
                <div className={`w-8 h-8 rounded-lg ${currentCategoryMeta.bgLight} border border-amber-500/20 flex items-center justify-center flex-shrink-0 mt-0.5`}>
                  {activeCategory === 'brainstorm' ? (
                    <Lightbulb className="w-4 h-4 text-sky-400" />
                  ) : (
                    <Sparkles className="w-4 h-4 text-amber-400" />
                  )}
                </div>

                <div className="rounded-2xl rounded-tl-xs p-3.5 sm:p-5 bg-stone-900 border border-stone-800 text-stone-300 text-xs sm:text-sm leading-relaxed space-y-2.5 shadow-md">
                  <div className="flex items-center gap-2 pb-1 border-b border-stone-800">
                    <span className="font-medium text-stone-200 text-xs">Gemini Companion</span>
                    {activeCategory === 'brainstorm' && (
                      <span className="px-1.5 py-0.5 rounded bg-sky-500/15 border border-sky-500/30 text-sky-300 font-medium text-[10px] inline-flex items-center gap-1">
                        <Lightbulb className="w-2.5 h-2.5 text-sky-400" />
                        3 Angles Mode
                      </span>
                    )}
                  </div>

                  <div className="text-stone-200 whitespace-pre-line text-xs sm:text-sm leading-relaxed">
                    {currentShowcase.sampleResponse}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Inspiration Prompts Footer */}
            <div className="p-4 sm:p-5 bg-stone-900/80 border-t border-stone-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-stone-300 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                  Explore Prompts for {currentCategoryMeta.label}
                </span>
                <span className="text-[11px] text-stone-400">Click to start with Google</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {currentShowcase.prompts.map((promptText, idx) => (
                  <button
                    key={idx}
                    onClick={onSignIn}
                    className="p-2.5 rounded-xl bg-stone-950/80 hover:bg-stone-800/90 border border-stone-800/80 hover:border-amber-500/30 text-left text-xs text-stone-300 hover:text-stone-100 transition group flex items-center justify-between gap-2 cursor-pointer"
                  >
                    <span className="truncate">"{promptText}"</span>
                    <ChevronRight className="w-3.5 h-3.5 text-stone-500 group-hover:text-amber-400 flex-shrink-0 transition-transform group-hover:translate-x-0.5" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* The Two Reflection Modes Comparison (Empathetic Reflection vs 3-Angles Brainstorm) */}
        <div className="space-y-6">
          <div className="text-center space-y-1.5 max-w-xl mx-auto">
            <h2 className="text-xl sm:text-2xl font-serif text-stone-100">
              Two Tailored Ways to Converse
            </h2>
            <p className="text-xs sm:text-sm text-stone-400">
              Switch between natural validation or radical perspective expansion whenever you need it.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
            {/* Send / Reflection Mode */}
            <div className="p-5 sm:p-6 rounded-2xl bg-stone-900/50 border border-stone-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 text-[10px] font-mono border border-amber-500/20">
                  Press Enter
                </span>
              </div>
              <h3 className="text-stone-100 font-semibold text-base">Standard Reflection (Empathetic)</h3>
              <p className="text-stone-400 text-xs sm:text-sm leading-relaxed">
                Acts as a compassionate, grounded sounding board. Gemini validates how you feel, notices subtle themes in your words, and asks open-ended inquiry questions to deepen clarity.
              </p>
              <ul className="text-xs text-stone-400 space-y-1.5 pt-1">
                <li className="flex items-center gap-2 text-stone-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                  Gentle, non-judgmental space
                </li>
                <li className="flex items-center gap-2 text-stone-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                  Follows your conversational pace
                </li>
              </ul>
            </div>

            {/* Brainstorm Mode */}
            <div className="p-5 sm:p-6 rounded-2xl bg-stone-900/50 border border-stone-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
                  <Lightbulb className="w-4 h-4" />
                </div>
                <span className="px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-300 text-[10px] font-mono border border-sky-500/20">
                  Click Brainstorm
                </span>
              </div>
              <h3 className="text-stone-100 font-semibold text-base">Brainstorm (3 Angles Mode)</h3>
              <p className="text-stone-400 text-xs sm:text-sm leading-relaxed">
                Break out of mental loops. Automatically structures your reflection into 3 distinct lenses: <b>Philosophical</b> (underlying values), <b>Pragmatic</b> (tangible next steps), and <b>Contrarian</b> (challenge assumptions).
              </p>
              <ul className="text-xs text-stone-400 space-y-1.5 pt-1">
                <li className="flex items-center gap-2 text-stone-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
                  Structured multi-lens breakdown
                </li>
                <li className="flex items-center gap-2 text-stone-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
                  Ideal for decisions, friction, and creative blocks
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Security & Cloud Firestore Foundation */}
        <div className="max-w-4xl mx-auto p-5 sm:p-7 rounded-3xl bg-stone-900/30 border border-stone-800 space-y-4">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base sm:text-lg font-serif text-stone-100">Private by Design & Production-Hardened</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs sm:text-sm text-stone-400">
            <div className="space-y-1.5 p-3 rounded-xl bg-stone-950/60 border border-stone-800/80">
              <div className="flex items-center gap-1.5 text-stone-200 font-medium">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                <span>Zero Stored Passwords</span>
              </div>
              <p className="text-xs text-stone-400 leading-relaxed">
                Federated Google Authentication handles credential verification securely without storing passwords in custom databases.
              </p>
            </div>

            <div className="space-y-1.5 p-3 rounded-xl bg-stone-950/60 border border-stone-800/80">
              <div className="flex items-center gap-1.5 text-stone-200 font-medium">
                <Database className="w-3.5 h-3.5 text-emerald-400" />
                <span>Owner-Isolated Rules</span>
              </div>
              <p className="text-xs text-stone-400 leading-relaxed">
                Cloud Firestore security rules strictly require <code className="text-stone-300 font-mono text-[11px]">request.auth.uid == userId</code> on all document paths.
              </p>
            </div>

            <div className="space-y-1.5 p-3 rounded-xl bg-stone-950/60 border border-stone-800/80">
              <div className="flex items-center gap-1.5 text-stone-200 font-medium">
                <Zap className="w-3.5 h-3.5 text-emerald-400" />
                <span>Server-Side Gemini API</span>
              </div>
              <p className="text-xs text-stone-400 leading-relaxed">
                API credentials never leak to client code; requests execute via secured server proxies with model fallback ladders.
              </p>
            </div>
          </div>
        </div>

        {/* Final Reassurance & Quick Sign-In */}
        <div className="text-center pt-2 pb-6 space-y-3">
          <button
            onClick={onSignIn}
            disabled={isLoading}
            className="inline-flex items-center justify-center gap-2.5 px-6 py-3 bg-stone-100 hover:bg-white text-stone-950 font-semibold text-sm rounded-xl shadow-md transition transform active:scale-98 cursor-pointer"
          >
            <span>Open Your Personal Journal</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <p className="text-[11px] text-stone-500">
            Powered by Google Cloud Firestore & Gemini AI • Ready instantly with your Google account
          </p>
        </div>

      </div>
    </div>
  );
};
