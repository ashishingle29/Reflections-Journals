import React, { useState, useMemo, useEffect } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
  InfoWindow,
  useMap,
} from '@vis.gl/react-google-maps';
import {
  MapPin,
  Compass,
  Sparkles,
  Calendar,
  BookOpen,
  ChevronRight,
  PlusCircle,
  Layers,
  AlertTriangle,
  Copy,
  Check,
  Pencil,
} from 'lucide-react';
import type { JournalEntry, JournalLocation, EntryCategory } from '../types';
import { LocationPickerModal } from './LocationPickerModal';

interface JourneyMapViewProps {
  entries: JournalEntry[];
  activeEntryId: string | null;
  onSelectEntry: (entryId: string) => void;
  onUpdateEntry?: (updatedEntry: JournalEntry) => Promise<void>;
  onCreateEntry?: (location: JournalLocation, title?: string, category?: EntryCategory) => Promise<JournalEntry>;
  onOpenLocationPicker?: () => void;
  onAddSampleEntry?: () => void;
}

const CATEGORY_COLORS: Record<string, { glyph: string; background: string; border: string }> = {
  reflection: { glyph: '#f59e0b', background: '#78350f', border: '#f59e0b' },
  gratitude: { glyph: '#10b981', background: '#064e3b', border: '#10b981' },
  brainstorm: { glyph: '#8b5cf6', background: '#4c1d95', border: '#8b5cf6' },
  daily_log: { glyph: '#3b82f6', background: '#1e3a8a', border: '#3b82f6' },
  deep_thought: { glyph: '#ec4899', background: '#831843', border: '#ec4899' },
};

// Smooth Google Maps pan controller component
const MapPanController: React.FC<{ location?: JournalLocation }> = ({ location }) => {
  const map = useMap();
  useEffect(() => {
    if (map && location && typeof location.lat === 'number' && typeof location.lng === 'number') {
      map.panTo({ lat: location.lat, lng: location.lng });
    }
  }, [map, location]);
  return null;
};

export const JourneyMapView: React.FC<JourneyMapViewProps> = ({
  entries,
  activeEntryId,
  onSelectEntry,
  onUpdateEntry,
  onCreateEntry,
  onOpenLocationPicker,
  onAddSampleEntry,
}) => {
  // Use env var for Google Maps Platform key
  const activeKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

  // Default to Google Maps tiles if an active API key is available, else cartography
  const [mapEngine, setMapEngine] = useState<'cartography' | 'google'>(
    activeKey ? 'google' : 'cartography'
  );
  const [authError, setAuthError] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [activeFilterCategory, setActiveFilterCategory] = useState<string>('all');
  const [mobileTab, setMobileTab] = useState<'map' | 'list'>('map');

  // In-map Location Geotagging Modal State
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [modalDefaultMode, setModalDefaultMode] = useState<'create' | 'tag'>('create');
  const [targetEntryForGeotag, setTargetEntryForGeotag] = useState<JournalEntry | null>(null);

  // Open modal directly on the journey map for creating new pin or tagging
  const handleOpenPinLocation = (mode: 'create' | 'tag' = 'create', targetEntry?: JournalEntry) => {
    setModalDefaultMode(mode);
    setTargetEntryForGeotag(targetEntry || (mode === 'tag' ? selectedEntry : null));
    setIsLocationModalOpen(true);
  };

  const handleSaveLocationOnMap = async (
    loc: JournalLocation | null,
    mode: 'create' | 'tag' = 'create',
    targetEntryId?: string,
    newEntryTitle?: string,
    category: EntryCategory = 'reflection'
  ) => {
    if (mode === 'create' && loc) {
      if (onCreateEntry) {
        const created = await onCreateEntry(loc, newEntryTitle, category);
        setActiveFilterCategory('all');
        setSelectedEntry(created);
      }
    } else if (mode === 'tag') {
      const targetId = targetEntryId || targetEntryForGeotag?.id;
      const target = entries.find((e) => e.id === targetId) || targetEntryForGeotag;
      if (target && onUpdateEntry) {
        const updatedEntry: JournalEntry = {
          ...target,
          location: loc || undefined,
          updatedAt: Date.now(),
        };
        await onUpdateEntry(updatedEntry);
        setActiveFilterCategory('all');
        setSelectedEntry(loc ? updatedEntry : null);
      }
    }

    setIsLocationModalOpen(false);
    setTargetEntryForGeotag(null);
  };

  const siteAuthorizedUrl = typeof window !== 'undefined' ? `${window.location.origin}/*` : '';

  // Intercept Google Maps authorization failure
  useEffect(() => {
    const onAuthFailure = () => {
      setAuthError(
        `Google Maps Platform rejected the API key (RefererNotAllowedMapError). The current URL (${siteAuthorizedUrl}) is not in the key's allowed HTTP referrers list.`
      );
      setMapEngine('cartography');
    };
    window.addEventListener('gmp-auth-failure', onAuthFailure);
    return () => window.removeEventListener('gmp-auth-failure', onAuthFailure);
  }, [siteAuthorizedUrl]);

  const handleCopyUrl = () => {
    if (!siteAuthorizedUrl) return;
    navigator.clipboard.writeText(siteAuthorizedUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2500);
  };

  // Filter entries that have a valid location
  const locationEntries = useMemo(() => {
    return entries.filter(
      (e) =>
        e.location &&
        typeof e.location.lat === 'number' &&
        typeof e.location.lng === 'number' &&
        !isNaN(e.location.lat) &&
        !isNaN(e.location.lng) &&
        (activeFilterCategory === 'all' || e.category === activeFilterCategory)
    );
  }, [entries, activeFilterCategory]);

  // Center calculation or default to global view
  const defaultCenter = useMemo(() => {
    if (locationEntries.length > 0 && locationEntries[0].location) {
      return { lat: locationEntries[0].location.lat, lng: locationEntries[0].location.lng };
    }
    return { lat: 25.0, lng: 10.0 }; // Balanced world center
  }, [locationEntries]);

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden bg-stone-950 relative">
      {/* Mobile Tab Switcher (Visible only on < md screens) */}
      <div className="flex md:hidden items-center justify-between px-3 py-2 bg-stone-900 border-b border-stone-800 z-30 shrink-0">
        <div className="flex items-center gap-1 bg-stone-950 p-1 rounded-xl border border-stone-800 text-xs">
          <button
            type="button"
            onClick={() => setMobileTab('map')}
            className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer flex items-center gap-1.5 ${
              mobileTab === 'map'
                ? 'bg-amber-500 text-stone-950 font-semibold shadow-xs'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Map View</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('list')}
            className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer flex items-center gap-1.5 ${
              mobileTab === 'list'
                ? 'bg-amber-500 text-stone-950 font-semibold shadow-xs'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Places ({locationEntries.length})</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => handleOpenPinLocation('create')}
          className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 border border-amber-500/30 text-xs flex items-center gap-1 transition cursor-pointer"
          title="Create a new pinned reflection on the map"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span className="text-[11px] font-medium">Pin Location</span>
        </button>
      </div>

      {/* Sidebar: Location-Tagged Reflections */}
      <div
        className={`${
          mobileTab === 'list' ? 'flex' : 'hidden'
        } md:flex w-full md:w-80 lg:w-96 border-b md:border-b-0 md:border-r border-stone-800 bg-stone-900/95 flex-col h-full z-10 shrink-0`}
      >
        <div className="p-4 border-b border-stone-800 hidden md:flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-stone-100">Journey Map</h2>
              <p className="text-xs text-stone-400">
                {locationEntries.length} {locationEntries.length === 1 ? 'place' : 'places'} pinned
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleOpenPinLocation('create')}
            className="p-1.5 rounded-lg bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 border border-amber-500/30 text-xs flex items-center gap-1 transition cursor-pointer"
            title="Create a new pinned reflection on the map"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Pin Location</span>
          </button>
        </div>

        {/* Category Filters */}
        <div className="px-3 py-2 border-b border-stone-800/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
          <button
            onClick={() => setActiveFilterCategory('all')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer whitespace-nowrap ${
              activeFilterCategory === 'all'
                ? 'bg-amber-500 text-stone-950 font-semibold'
                : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
            }`}
          >
            All
          </button>
          {Object.keys(CATEGORY_COLORS).map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveFilterCategory(cat)}
              className={`px-2 py-1 rounded-lg text-xs capitalize transition cursor-pointer whitespace-nowrap ${
                activeFilterCategory === cat
                  ? 'bg-amber-500 text-stone-950 font-semibold'
                  : 'bg-stone-800/80 text-stone-300 hover:bg-stone-700'
              }`}
            >
              {cat.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Pinned List */}
        <div className="flex-1 overflow-y-auto subtle-scrollbar p-3 space-y-2">
          {locationEntries.length === 0 ? (
            <div className="text-center py-10 px-4">
              <div className="w-12 h-12 mx-auto rounded-full bg-stone-800 flex items-center justify-center text-stone-500 mb-3">
                <MapPin className="w-6 h-6" />
              </div>
              <p className="text-xs font-medium text-stone-300 mb-1">No reflections pinned yet</p>
              <p className="text-[11px] text-stone-500 mb-4 max-w-xs mx-auto">
                Tag your thoughts with a mountain retreat, café, or quiet sanctuary to explore your geographic journey.
              </p>
              <button
                type="button"
                onClick={() => handleOpenPinLocation('create')}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500 text-stone-950 text-xs font-semibold hover:bg-amber-400 transition cursor-pointer inline-flex items-center gap-1.5"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Pin New Sanctuary
              </button>
            </div>
          ) : (
            locationEntries.map((entry) => {
              const isSelected = selectedEntry?.id === entry.id;
              const catConfig = CATEGORY_COLORS[entry.category] || CATEGORY_COLORS.reflection;
              return (
                <div
                  key={entry.id}
                  onClick={() => {
                    setSelectedEntry(entry);
                    setMobileTab('map');
                  }}
                  className={`p-3 rounded-xl border transition cursor-pointer text-left ${
                    isSelected
                      ? 'bg-stone-800 border-amber-500/50 shadow-sm'
                      : 'bg-stone-900/60 border-stone-800/80 hover:bg-stone-800/50 hover:border-stone-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="text-xs font-medium text-stone-200 line-clamp-1">
                      {entry.title || 'Untitled Reflection'}
                    </span>
                    <span
                      className="px-1.5 py-0.5 text-[9px] rounded font-semibold uppercase tracking-wider shrink-0"
                      style={{
                        backgroundColor: `${catConfig.border}20`,
                        color: catConfig.border,
                        border: `1px solid ${catConfig.border}40`,
                      }}
                    >
                      {entry.category.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-[11px] text-amber-400/90 mb-1.5">
                    <MapPin className="w-3 h-3 shrink-0" />
                    <span className="truncate">{entry.location?.placeName}</span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-stone-500 pt-1 border-t border-stone-800/50">
                    <span>{new Date(entry.updatedAt).toLocaleDateString()}</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenPinLocation('tag', entry);
                        }}
                        className="text-stone-400 hover:text-amber-300 flex items-center gap-0.5 transition px-1.5 py-0.5 rounded hover:bg-stone-700/50"
                        title="Edit location"
                      >
                        <Pencil className="w-2.5 h-2.5" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectEntry(entry.id);
                        }}
                        className="text-stone-400 hover:text-amber-400 flex items-center gap-0.5 transition px-1.5 py-0.5 rounded hover:bg-stone-700/50"
                      >
                        <span>Open</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Main Map Canvas Area */}
      <div
        className={`${
          mobileTab === 'map' ? 'flex' : 'hidden'
        } md:flex flex-1 h-full relative overflow-hidden flex-col`}
      >
        {/* Map Engine Control Bar */}
        <div className="bg-stone-900 border-b border-stone-800 px-4 py-2.5 flex items-center justify-between gap-3 text-xs text-stone-300 z-20">
          <div className="flex items-center gap-2">
            <span className="text-stone-400 font-medium">Engine:</span>
            <div className="inline-flex rounded-lg bg-stone-950 p-0.5 border border-stone-800">
              <button
                type="button"
                onClick={() => setMapEngine('cartography')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                  mapEngine === 'cartography'
                    ? 'bg-amber-500 text-stone-950 font-semibold shadow-xs'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Global Cartography</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthError(null);
                  setMapEngine('google');
                }}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                  mapEngine === 'google'
                    ? 'bg-amber-500 text-stone-950 font-semibold shadow-xs'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Google Maps Tiles</span>
              </button>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-stone-400 text-xs">
            <MapPin className="w-3.5 h-3.5 text-amber-500" />
            <span>
              {locationEntries.length} {locationEntries.length === 1 ? 'geotagged entry' : 'geotagged entries'}
            </span>
          </div>
        </div>

        {/* HTTP Referrer Restriction Warning Notice */}
        {authError && (
          <div className="bg-amber-950/40 border-b border-amber-500/40 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-200 z-20">
            <div className="flex items-start gap-2.5 max-w-2xl">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-amber-300 font-semibold">Google Maps Key: RefererNotAllowedMapError</strong>
                <p className="text-[11px] text-amber-200/90 mt-0.5">
                  The API key has HTTP referrer restrictions in Google Cloud Console. To authorize this app URL, add:
                  <code className="mx-1 px-1.5 py-0.5 rounded bg-stone-900 border border-amber-500/30 font-mono text-amber-300">
                    {siteAuthorizedUrl}
                  </code>
                  to allowed referrers. The app has switched to built-in Cartography.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleCopyUrl}
                className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-medium flex items-center gap-1 transition cursor-pointer"
              >
                {copiedUrl ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedUrl ? 'Copied' : 'Copy URL'}</span>
              </button>
              <button
                onClick={() => setAuthError(null)}
                className="text-stone-400 hover:text-stone-200 text-xs px-1"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Map Container */}
        <div className="flex-1 w-full h-full relative overflow-hidden">
          {mapEngine === 'google' && activeKey && !authError ? (
            <APIProvider
              apiKey={activeKey}
              solutionChannel="GMP_mcp_codeassist_v1_aistudio"
              onError={(err) => {
                console.warn('Google Maps APIProvider error:', err);
                setAuthError(
                  `Google Maps key authorization rejected (RefererNotAllowedMapError). Domain "${siteAuthorizedUrl}" must be authorized in Google Cloud Console.`
                );
                setMapEngine('cartography');
              }}
            >
              <Map
                defaultCenter={defaultCenter}
                defaultZoom={locationEntries.length > 0 ? 4 : 2}
                mapId="DEMO_MAP_ID"
                internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                gestureHandling="greedy"
                disableDefaultUI={false}
                className="w-full h-full"
              >
                <MapPanController location={selectedEntry?.location} />

                {locationEntries.map((entry) => {
                  if (!entry.location) return null;
                  const isSelected = selectedEntry?.id === entry.id;
                  const catColor = CATEGORY_COLORS[entry.category] || CATEGORY_COLORS.reflection;

                  return (
                    <AdvancedMarker
                      key={entry.id}
                      position={{ lat: entry.location.lat, lng: entry.location.lng }}
                      title={entry.location.placeName || entry.title}
                      onClick={() => setSelectedEntry(entry)}
                    >
                      <Pin
                        background={catColor.background}
                        borderColor={isSelected ? '#ffffff' : catColor.border}
                        glyphColor={isSelected ? '#ffffff' : catColor.glyph}
                        scale={isSelected ? 1.3 : 1.0}
                      />
                    </AdvancedMarker>
                  );
                })}

                {/* InfoWindow for Selected Reflection Marker */}
                {selectedEntry && selectedEntry.location && (
                  <InfoWindow
                    position={{
                      lat: selectedEntry.location.lat,
                      lng: selectedEntry.location.lng,
                    }}
                    onCloseClick={() => setSelectedEntry(null)}
                  >
                    <div className="w-72 sm:w-80 text-stone-900 text-xs p-4 space-y-2.5">
                      {/* Title & Category Header with clearance for close button */}
                      <div className="pr-8">
                        <span className="text-[10px] font-semibold text-amber-800 uppercase tracking-wider block mb-0.5">
                          {selectedEntry.category.replace('_', ' ')}
                        </span>
                        <h3 className="font-bold text-stone-900 text-sm leading-snug">
                          {selectedEntry.title || 'Untitled Reflection'}
                        </h3>
                      </div>

                      <div className="flex items-center gap-1.5 text-amber-900 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                        <span className="truncate">{selectedEntry.location.placeName}</span>
                      </div>

                      {selectedEntry.summary ? (
                        <p className="text-xs text-stone-700 line-clamp-3 italic leading-relaxed bg-amber-50/70 p-2.5 rounded-lg border border-amber-200/70">
                          "{selectedEntry.summary}"
                        </p>
                      ) : selectedEntry.turns[0]?.content ? (
                        <p className="text-xs text-stone-700 line-clamp-3 leading-relaxed bg-stone-50 p-2.5 rounded-lg border border-stone-200">
                          {selectedEntry.turns[0].content}
                        </p>
                      ) : null}

                      <div className="pt-2.5 border-t border-stone-200 flex items-center justify-between">
                        <span className="text-[11px] text-stone-500 font-medium">
                          {new Date(selectedEntry.updatedAt).toLocaleDateString()}
                        </span>
                        <button
                          type="button"
                          onClick={() => onSelectEntry(selectedEntry.id)}
                          className="px-3 py-1.5 rounded-lg bg-amber-600 text-white font-medium hover:bg-amber-700 transition flex items-center gap-1.5 text-xs shadow-xs cursor-pointer"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>Open Reflection</span>
                        </button>
                      </div>
                    </div>
                  </InfoWindow>
                )}
              </Map>
            </APIProvider>
          ) : (
            /* Interactive Cartographic Canvas when waiting for Google Maps API Key */
            <div className="w-full h-full bg-stone-950 flex flex-col items-center justify-between p-3 sm:p-5 md:p-6 relative overflow-hidden select-none">
              {/* Subtle World Map Grid Background */}
              <div 
                className="absolute inset-0 opacity-20 pointer-events-none"
                style={{
                  backgroundImage: `
                    radial-gradient(circle at 50% 50%, rgba(245, 158, 11, 0.08) 0%, transparent 70%),
                    linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px),
                    linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)
                  `,
                  backgroundSize: '100% 100%, 40px 40px, 40px 40px',
                }}
              />

              {/* Plotted Pins on Projection */}
              <div className="relative w-full max-w-5xl flex-1 min-h-[300px] sm:min-h-[380px] rounded-2xl border border-stone-800 bg-stone-900/60 backdrop-blur-xs p-4 overflow-hidden shadow-2xl flex flex-col justify-between">
                {/* Equator & Meridian Guides */}
                <div className="absolute inset-x-0 top-1/2 border-b border-dashed border-stone-800 pointer-events-none" />
                <div className="absolute inset-y-0 left-1/2 border-r border-dashed border-stone-800 pointer-events-none" />
                <div className="absolute top-2.5 left-3 text-[10px] font-mono text-stone-500 uppercase tracking-widest">
                  Global Contemplation Cartography
                </div>
                <div className="absolute bottom-2.5 right-3 text-[10px] font-mono text-stone-500">
                  {locationEntries.length} {locationEntries.length === 1 ? 'place' : 'places'} plotted
                </div>

                {locationEntries.length === 0 ? (
                  <div className="w-full h-full flex flex-col items-center justify-center text-center p-6 space-y-3 my-auto">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                      <Compass className="w-6 h-6 animate-spin-slow" />
                    </div>
                    <div className="max-w-xs space-y-1">
                      <h4 className="text-sm font-medium text-stone-200">No Geotagged Reflections Yet</h4>
                      <p className="text-xs text-stone-400">
                        Tag your reflections with places or sanctuaries to visualize them on your global journey.
                      </p>
                    </div>
                    {onAddSampleEntry && (
                      <button
                        onClick={onAddSampleEntry}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-medium transition cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Add Kyoto Sample Reflection</span>
                      </button>
                    )}
                  </div>
                ) : (
                  locationEntries.map((entry) => {
                    if (!entry.location) return null;
                    // Equirectangular projection coordinates
                    const xPercent = Math.max(5, Math.min(95, ((entry.location.lng + 180) / 360) * 100));
                    const yPercent = Math.max(8, Math.min(92, ((90 - entry.location.lat) / 180) * 100));
                    const isSelected = selectedEntry?.id === entry.id;
                    const catColor = CATEGORY_COLORS[entry.category] || CATEGORY_COLORS.reflection;

                    return (
                      <div
                        key={entry.id}
                        onClick={() => setSelectedEntry(entry)}
                        className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
                        style={{ left: `${xPercent}%`, top: `${yPercent}%` }}
                      >
                        {/* Pulse Ring */}
                        <div 
                          className="absolute -inset-2 rounded-full animate-ping opacity-30" 
                          style={{ backgroundColor: catColor.glyph }} 
                        />
                        <div 
                          className={`relative p-1.5 rounded-full border shadow-lg transition-all duration-200 flex items-center justify-center ${
                            isSelected ? 'scale-125 ring-2 ring-white z-30' : 'hover:scale-110 z-20'
                          }`}
                          style={{ 
                            backgroundColor: catColor.background, 
                            borderColor: catColor.border,
                            color: catColor.glyph 
                          }}
                        >
                          <MapPin className="w-3.5 h-3.5" />
                        </div>
                        <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 whitespace-nowrap bg-stone-900 border border-stone-700 text-stone-100 text-[11px] px-2 py-0.5 rounded shadow-lg z-40">
                          {entry.location.placeName}
                        </div>
                      </div>
                    );
                  })
                )}

                {/* Centered, Balanced Floating Preview Card when pin selected */}
                {selectedEntry && selectedEntry.location && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm p-4 rounded-xl bg-stone-900/95 border border-amber-500/50 shadow-2xl backdrop-blur-md z-40 text-xs text-stone-100 space-y-2.5 animate-fadeIn">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 pr-2">
                        <span className="text-[10px] font-mono text-amber-400 font-semibold uppercase tracking-wider block">
                          {selectedEntry.category.replace('_', ' ')}
                        </span>
                        <h4 className="font-semibold text-stone-100 text-sm truncate">{selectedEntry.title || 'Untitled Reflection'}</h4>
                      </div>
                      <button 
                        onClick={() => setSelectedEntry(null)} 
                        className="text-stone-400 hover:text-stone-100 p-1 rounded-md hover:bg-stone-800 transition cursor-pointer shrink-0"
                        aria-label="Close preview"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-amber-300 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="truncate">{selectedEntry.location.placeName}</span>
                    </div>

                    {selectedEntry.summary ? (
                      <p className="text-xs text-stone-300 line-clamp-3 italic leading-relaxed bg-stone-950/70 p-2.5 rounded-lg border border-stone-800">
                        "{selectedEntry.summary}"
                      </p>
                    ) : selectedEntry.turns[0]?.content ? (
                      <p className="text-xs text-stone-300 line-clamp-3 leading-relaxed bg-stone-950/70 p-2.5 rounded-lg border border-stone-800">
                        {selectedEntry.turns[0].content}
                      </p>
                    ) : null}

                    <div className="pt-2 border-t border-stone-800 flex items-center justify-between">
                      <span className="text-[11px] text-stone-400 font-mono">
                        {selectedEntry.location.lat.toFixed(3)}°, {selectedEntry.location.lng.toFixed(3)}°
                      </span>
                      <button
                        onClick={() => onSelectEntry(selectedEntry.id)}
                        className="px-3 py-1.5 rounded-lg bg-amber-500 text-stone-950 font-semibold hover:bg-amber-400 transition flex items-center gap-1.5 text-xs shadow-xs cursor-pointer"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Open Reflection</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Notice */}
              <div className="mt-2.5 text-center max-w-md space-y-0.5 shrink-0">
                <p className="text-[11px] text-stone-400">
                  Global projection active. Toggle Google Maps Tiles above to view interactive vector street and satellite tiles.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Direct In-Map Location Geotagging Modal */}
      {isLocationModalOpen && (
        <LocationPickerModal
          isOpen={isLocationModalOpen}
          defaultMode={modalDefaultMode}
          availableEntries={entries}
          initialTargetEntryId={targetEntryForGeotag?.id || null}
          currentLocation={targetEntryForGeotag?.location}
          entryTitle={targetEntryForGeotag?.title}
          onClose={() => {
            setIsLocationModalOpen(false);
            setTargetEntryForGeotag(null);
          }}
          onSaveLocation={handleSaveLocationOnMap}
        />
      )}
    </div>
  );
};
