import React, { useState } from 'react';
import { BookOpen, Sparkles, LogOut, ShieldCheck, User, PanelLeft, Menu, Compass, Shield } from 'lucide-react';
import type { UserProfile } from '../types';
import { isUserAdmin } from '../lib/firebase';

interface NavbarProps {
  user: UserProfile | null;
  onNewEntry?: () => void;
  onSignOut: () => void;
  onSignIn: () => void;
  isSaving?: boolean;
  saveError?: string | null;
  onRetrySave?: () => void;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  entryCount?: number;
  locationCount?: number;
  activeView?: 'journal' | 'map' | 'admin';
  onViewChange?: (view: 'journal' | 'map' | 'admin') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onNewEntry,
  onSignOut,
  onSignIn,
  isSaving,
  saveError,
  onRetrySave,
  isSidebarOpen,
  onToggleSidebar,
  entryCount,
  locationCount = 0,
  activeView = 'journal',
  onViewChange,
}) => {
  const [avatarError, setAvatarError] = useState(false);
  const isAdmin = user ? (user.role === 'admin' || isUserAdmin(user.email)) : false;

  return (
    <header className="sticky top-0 z-30 bg-stone-900/95 backdrop-blur-md border-b border-stone-800 text-stone-100 flex-shrink-0">
      <div className="w-full px-3 sm:px-4 lg:px-6 h-12 sm:h-14 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left Section: Sidebar Toggle & Brand */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {user && onToggleSidebar && activeView === 'journal' && (
            <button
              id="btn-toggle-sidebar"
              onClick={onToggleSidebar}
              className={`p-1.5 sm:p-2 min-h-[36px] min-w-[36px] sm:min-h-[40px] sm:min-w-[40px] flex items-center justify-center rounded-xl transition cursor-pointer ${
                isSidebarOpen
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'text-stone-400 hover:text-stone-100 hover:bg-stone-800/80 border border-stone-800'
              }`}
              title={isSidebarOpen ? 'Hide Past Reflections' : 'View Past Reflections'}
              aria-label="Toggle Past Reflections Sidebar"
            >
              <PanelLeft className="w-5 h-5 hidden sm:block" />
              <Menu className="w-5 h-5 sm:hidden" />
              {typeof entryCount === 'number' && entryCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-stone-800 text-stone-300 text-[10px] font-mono border border-stone-700/80 sm:hidden">
                  {entryCount}
                </span>
              )}
            </button>
          )}

          {/* Logo & Title */}
          <div 
            onClick={() => onViewChange && onViewChange('journal')}
            className="flex items-center gap-2 sm:gap-2.5 min-w-0 cursor-pointer"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-gradient-to-tr from-amber-600 to-amber-500 flex items-center justify-center text-stone-950 shadow-md flex-shrink-0">
              <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="font-semibold tracking-tight text-sm sm:text-base md:text-lg text-stone-100 truncate">
                  Reflections
                  <span className="hidden xs:inline"> Journal</span>
                </span>
                <span className="hidden md:inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono flex-shrink-0">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  Gemini 3.6 Flash
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Center: Navigation Modes (Journal, Journey Map, Admin RBAC) */}
        {user && onViewChange && (
          <nav className="flex items-center gap-1 bg-stone-950/80 p-1 rounded-xl border border-stone-800 text-xs">
            <button
              onClick={() => onViewChange('journal')}
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition cursor-pointer ${
                activeView === 'journal'
                  ? 'bg-amber-500 text-stone-950 font-semibold shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
              title="Journal & Dialogue View"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Reflections</span>
            </button>

            <button
              onClick={() => onViewChange('map')}
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition cursor-pointer ${
                activeView === 'map'
                  ? 'bg-amber-500 text-stone-950 font-semibold shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
              title="Google Maps Journey"
            >
              <Compass className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Journey Map</span>
              {locationCount > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  activeView === 'map' ? 'bg-stone-950 text-amber-400 font-bold' : 'bg-stone-800 text-stone-300'
                }`}>
                  {locationCount}
                </span>
              )}
            </button>

            {isAdmin && (
              <button
                onClick={() => onViewChange('admin')}
                className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition cursor-pointer ${
                  activeView === 'admin'
                    ? 'bg-amber-500 text-stone-950 font-semibold shadow-sm'
                    : 'text-amber-400/90 hover:text-amber-300 hover:bg-amber-500/10'
                }`}
                title="Admin Users Directory"
              >
                <Shield className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Admin</span>
              </button>
            )}
          </nav>
        )}

        {/* Right Section: Actions & User Info */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 flex-shrink-0">
          {saveError && onRetrySave && (
            <button
              onClick={onRetrySave}
              className="text-xs text-red-400 bg-red-950/80 border border-red-800/80 px-2 sm:px-2.5 py-1 rounded-lg hover:bg-red-900 transition flex items-center gap-1 min-h-[36px] sm:min-h-[40px]"
              title="Click to retry saving to Firestore"
            >
              <span className="hidden xs:inline">Save error</span>
              <span className="underline font-medium">Retry</span>
            </button>
          )}

          {isSaving && (
            <span className="text-xs text-amber-400/90 items-center gap-1.5 hidden md:inline-flex">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              Saving...
            </span>
          )}

          {user ? (
            <div className="flex items-center gap-1.5 sm:gap-2">
              {user.photoURL && !avatarError ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User profile'}
                  onError={() => setAvatarError(true)}
                  referrerPolicy="no-referrer"
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-stone-700 object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-stone-800 border border-stone-700 flex items-center justify-center text-stone-300 flex-shrink-0">
                  <User className="w-4 h-4" />
                </div>
              )}
              
              <div className="hidden lg:block text-left text-xs">
                <div className="font-medium text-stone-200 truncate max-w-[130px] flex items-center gap-1">
                  <span>{user.displayName || 'Anonymous'}</span>
                  {isAdmin && (
                    <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1 py-0.2 rounded font-mono font-bold">
                      ADMIN
                    </span>
                  )}
                </div>
                <div className="text-stone-400 truncate max-w-[130px] text-[10px]">
                  {user.email}
                </div>
              </div>

              <button
                id="btn-sign-out"
                onClick={onSignOut}
                className="p-2 min-h-[38px] min-w-[38px] sm:min-h-[40px] sm:min-w-[40px] flex items-center justify-center text-stone-400 hover:text-stone-100 hover:bg-stone-800 rounded-lg transition cursor-pointer"
                title="Sign Out"
                aria-label="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              id="btn-nav-sign-in"
              onClick={onSignIn}
              className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-1.5 bg-stone-100 hover:bg-white text-stone-900 font-medium text-xs sm:text-sm rounded-lg sm:rounded-xl shadow transition min-h-[38px] sm:min-h-[40px] cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};


