import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  Heart, 
  Lightbulb, 
  BookOpen, 
  Compass, 
  ChevronDown, 
  Check, 
  Layers
} from 'lucide-react';
import type { EntryCategory } from '../types';

export interface CategoryMeta {
  id: EntryCategory;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeColor: string;
  textColor: string;
  bgLight: string;
  borderActive: string;
}

export const CATEGORY_DEFINITIONS: Record<EntryCategory, CategoryMeta> = {
  reflection: {
    id: 'reflection',
    label: 'Reflection',
    description: 'Inner inquiry & self-discovery',
    icon: Sparkles,
    badgeColor: 'bg-amber-500/15 border-amber-500/30 text-amber-300',
    textColor: 'text-amber-300',
    bgLight: 'bg-amber-500/20 text-amber-400',
    borderActive: 'border-amber-500/50',
  },
  gratitude: {
    id: 'gratitude',
    label: 'Gratitude',
    description: 'Appreciation & blessings',
    icon: Heart,
    badgeColor: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300',
    textColor: 'text-emerald-300',
    bgLight: 'bg-emerald-500/20 text-emerald-400',
    borderActive: 'border-emerald-500/50',
  },
  brainstorm: {
    id: 'brainstorm',
    label: 'Brainstorm',
    description: 'Fresh ideas & perspective shifts',
    icon: Lightbulb,
    badgeColor: 'bg-sky-500/15 border-sky-500/30 text-sky-300',
    textColor: 'text-sky-300',
    bgLight: 'bg-sky-500/20 text-sky-400',
    borderActive: 'border-sky-500/50',
  },
  daily_log: {
    id: 'daily_log',
    label: 'Daily Log',
    description: 'Daily timeline & experiences',
    icon: BookOpen,
    badgeColor: 'bg-purple-500/15 border-purple-500/30 text-purple-300',
    textColor: 'text-purple-300',
    bgLight: 'bg-purple-500/20 text-purple-400',
    borderActive: 'border-purple-500/50',
  },
  deep_thought: {
    id: 'deep_thought',
    label: 'Deep Thought',
    description: 'Philosophy & foundational truth',
    icon: Compass,
    badgeColor: 'bg-rose-500/15 border-rose-500/30 text-rose-300',
    textColor: 'text-rose-300',
    bgLight: 'bg-rose-500/20 text-rose-400',
    borderActive: 'border-rose-500/50',
  },
};

export const ALL_CATEGORIES: EntryCategory[] = [
  'reflection',
  'daily_log',
  'gratitude',
  'brainstorm',
  'deep_thought',
];

interface CategoryDropdownProps {
  id?: string;
  value: EntryCategory | 'all';
  onChange: (value: any) => void;
  allowAll?: boolean;
  disabled?: boolean;
  align?: 'left' | 'right';
  size?: 'sm' | 'md';
}

export const CategoryDropdown: React.FC<CategoryDropdownProps> = ({
  id = 'category-dropdown',
  value,
  onChange,
  allowAll = false,
  disabled = false,
  align = 'left',
  size = 'sm',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape key
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const currentMeta = value === 'all' ? null : CATEGORY_DEFINITIONS[value as EntryCategory];

  return (
    <div ref={containerRef} className="relative inline-block text-left" id={`${id}-container`}>
      {/* Trigger Button */}
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={`inline-flex items-center gap-1.5 rounded-lg border transition-all cursor-pointer select-none ${
          size === 'sm' ? 'px-2 py-1 text-xs' : 'px-2.5 py-1.5 text-xs sm:text-sm'
        } ${
          currentMeta
            ? `${currentMeta.badgeColor} hover:brightness-110 active:scale-98`
            : 'bg-stone-900/90 hover:bg-stone-800/90 text-stone-300 border-stone-700/80'
        } ${isOpen ? 'ring-2 ring-amber-500/40 border-amber-500/60 shadow-md' : 'shadow-xs'} disabled:opacity-40 disabled:cursor-not-allowed`}
        title="Change category"
      >
        {currentMeta ? (
          <>
            <currentMeta.icon className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="font-medium tracking-wide">{currentMeta.label}</span>
          </>
        ) : (
          <>
            <Layers className="w-3.5 h-3.5 text-stone-400 flex-shrink-0" />
            <span className="font-medium tracking-wide">All Categories</span>
          </>
        )}
        <ChevronDown
          className={`w-3 h-3 text-stone-400 transition-transform duration-200 flex-shrink-0 ${
            isOpen ? 'rotate-180 text-amber-400' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu Popover */}
      {isOpen && (
        <div
          role="listbox"
          className={`absolute z-50 mt-1.5 w-60 rounded-xl bg-stone-900/95 backdrop-blur-md border border-stone-700/80 shadow-2xl p-1.5 space-y-1 transform opacity-100 scale-100 transition-all ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          <div className="px-2 py-1 flex items-center justify-between border-b border-stone-800 text-[10px] font-semibold uppercase tracking-wider text-stone-400">
            <span>Select Category</span>
            <span className="text-stone-500 lowercase font-normal">styled options</span>
          </div>

          {allowAll && (
            <button
              type="button"
              role="option"
              aria-selected={value === 'all'}
              onClick={() => {
                onChange('all');
                setIsOpen(false);
              }}
              className={`w-full flex items-center justify-between gap-2.5 px-2.5 py-1.5 rounded-lg text-xs transition cursor-pointer text-left ${
                value === 'all'
                  ? 'bg-stone-800 text-stone-100 font-medium'
                  : 'text-stone-300 hover:bg-stone-800/60 hover:text-stone-100'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-6 h-6 rounded-md bg-stone-800 border border-stone-700 flex items-center justify-center text-stone-300 flex-shrink-0">
                  <Layers className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-medium text-xs text-stone-200">All Categories</div>
                  <div className="text-[10px] text-stone-400">Show all entries</div>
                </div>
              </div>
              {value === 'all' && <Check className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />}
            </button>
          )}

          {ALL_CATEGORIES.map((catId) => {
            const meta = CATEGORY_DEFINITIONS[catId];
            const isSelected = value === catId;
            const IconComponent = meta.icon;

            return (
              <button
                key={catId}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(catId);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs transition cursor-pointer text-left group ${
                  isSelected
                    ? 'bg-stone-800/90 border border-stone-700/80 text-stone-100'
                    : 'text-stone-300 hover:bg-stone-800/60 hover:text-stone-100'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 ${meta.bgLight}`}
                  >
                    <IconComponent className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`font-medium text-xs ${isSelected ? meta.textColor : 'text-stone-200'}`}>
                        {meta.label}
                      </span>
                    </div>
                    <p className="text-[10px] text-stone-400 truncate leading-tight">
                      {meta.description}
                    </p>
                  </div>
                </div>

                {isSelected ? (
                  <Check className={`w-3.5 h-3.5 flex-shrink-0 ${meta.textColor}`} />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-stone-700 group-hover:bg-stone-500 flex-shrink-0 transition-colors" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
