import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, X, Check, Sparkles, Trash2, Compass, Plus, Tag } from 'lucide-react';
import type { JournalLocation, JournalEntry, EntryCategory } from '../types';

interface LocationPickerModalProps {
  currentLocation?: JournalLocation;
  entryTitle?: string;
  isOpen: boolean;
  onClose: () => void;
  onSaveLocation: (
    location: JournalLocation | null,
    mode?: 'create' | 'tag',
    targetEntryId?: string,
    newEntryTitle?: string,
    category?: EntryCategory
  ) => Promise<void> | void;
  availableEntries?: JournalEntry[];
  initialTargetEntryId?: string | null;
  defaultMode?: 'create' | 'tag';
}

const INSPIRATIONAL_SANCTUARIES: Array<{ name: string; city: string; country: string; lat: number; lng: number; description: string }> = [
  { name: 'Kyoto Arashiyama Bamboo Grove', city: 'Kyoto', country: 'Japan', lat: 35.0169, lng: 135.6713, description: 'Wind whispering through ancient emerald stalks' },
  { name: 'Big Sur Coastal Bluffs', city: 'Big Sur', country: 'USA', lat: 36.2704, lng: -121.8081, description: 'Crashing Pacific waves and misty sea cliffs' },
  { name: 'Central Park Sheep Meadow', city: 'New York', country: 'USA', lat: 40.7719, lng: -73.9742, description: 'A quiet green pocket nestled within the urban skyline' },
  { name: 'Santorini Caldera Overlook', city: 'Oia', country: 'Greece', lat: 36.4618, lng: 25.3753, description: 'Calm Aegean blue horizons under dusk skies' },
  { name: 'Lake Tahoe Alpine Shore', city: 'Lake Tahoe', country: 'USA', lat: 39.0968, lng: -120.0324, description: 'Crystal-clear alpine waters mirroring pine ridges' },
  { name: 'Mount Fuji Foothills', city: 'Fujiyoshida', country: 'Japan', lat: 35.3606, lng: 138.7274, description: 'Timeless stillness and contemplation' },
  { name: 'Paris Seine Riverside Bench', city: 'Paris', country: 'France', lat: 48.8566, lng: 2.3522, description: 'Gentle river ripples beneath ancient bridges' },
  { name: 'Banff Moraine Lake', city: 'Banff', country: 'Canada', lat: 51.3217, lng: -116.1860, description: 'Turquoise glacial waters framed by rugged peaks' },
  { name: 'Quiet Home Sanctuary', city: 'Personal Space', country: '', lat: 37.7749, lng: -122.4194, description: 'The calm sanctuary of your own personal space' },
];

const CATEGORIES: Array<{ id: EntryCategory; label: string }> = [
  { id: 'reflection', label: 'Reflection' },
  { id: 'gratitude', label: 'Gratitude' },
  { id: 'deep_thought', label: 'Deep Thought' },
  { id: 'brainstorm', label: 'Brainstorm' },
  { id: 'daily_log', label: 'Daily Log' },
];

export const LocationPickerModal: React.FC<LocationPickerModalProps> = ({
  currentLocation,
  entryTitle,
  isOpen,
  onClose,
  onSaveLocation,
  availableEntries,
  initialTargetEntryId,
  defaultMode = 'create',
}) => {
  const [modalMode, setModalMode] = useState<'create' | 'tag'>(
    availableEntries && availableEntries.length > 0 ? defaultMode : 'tag'
  );
  const [selectedEntryId, setSelectedEntryId] = useState<string>(
    initialTargetEntryId || (availableEntries && availableEntries.length > 0 ? availableEntries[0].id : '')
  );

  const [newTitle, setNewTitle] = useState('');
  const [category, setCategory] = useState<EntryCategory>('reflection');

  const [placeName, setPlaceName] = useState(currentLocation?.placeName || '');
  const [city, setCity] = useState(currentLocation?.city || '');
  const [country, setCountry] = useState(currentLocation?.country || '');
  const [lat, setLat] = useState<number>(currentLocation?.lat ?? 37.7749);
  const [lng, setLng] = useState<number>(currentLocation?.lng ?? -122.4194);
  const [isLocating, setIsLocating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [gpsNotice, setGpsNotice] = useState<string | null>(null);

  // Sync state if initialTargetEntryId or currentLocation changes
  useEffect(() => {
    if (initialTargetEntryId) {
      setSelectedEntryId(initialTargetEntryId);
    }
  }, [initialTargetEntryId]);

  useEffect(() => {
    if (currentLocation) {
      setPlaceName(currentLocation.placeName || '');
      setCity(currentLocation.city || '');
      setCountry(currentLocation.country || '');
      setLat(currentLocation.lat ?? 37.7749);
      setLng(currentLocation.lng ?? -122.4194);
    }
  }, [currentLocation]);

  // When switching selected entry in "tag" mode, sync location if it has one
  const handleEntrySelectChange = (entryId: string) => {
    setSelectedEntryId(entryId);
    const target = availableEntries?.find((e) => e.id === entryId);
    if (target?.location) {
      setPlaceName(target.location.placeName || '');
      setCity(target.location.city || '');
      setCountry(target.location.country || '');
      setLat(target.location.lat ?? 37.7749);
      setLng(target.location.lng ?? -122.4194);
    }
  };

  if (!isOpen) return null;

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGpsNotice('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    setGpsNotice(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = Number(position.coords.latitude.toFixed(5));
        const longitude = Number(position.coords.longitude.toFixed(5));
        setLat(latitude);
        setLng(longitude);
        if (!placeName || placeName === 'Quiet Home Sanctuary') {
          setPlaceName('Current Reflection Spot');
          setCity('Local Sanctuary');
        }
        setIsLocating(false);
        setGpsNotice('GPS coordinates captured accurately!');
      },
      (error) => {
        setIsLocating(false);
        setGpsNotice(`Could not fetch GPS location: ${error.message}`);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleSelectPreset = (preset: typeof INSPIRATIONAL_SANCTUARIES[0]) => {
    setPlaceName(preset.name);
    setCity(preset.city);
    setCountry(preset.country);
    setLat(preset.lat);
    setLng(preset.lng);
    setGpsNotice(null);
    if (!newTitle) {
      setNewTitle(preset.name);
    }
  };

  const handleSave = async () => {
    if (!placeName.trim()) {
      setGpsNotice('Please provide a place name or sanctuary title.');
      return;
    }

    const loc: JournalLocation = {
      placeName: placeName.trim(),
      city: city.trim() || undefined,
      country: country.trim() || undefined,
      lat: Number(lat),
      lng: Number(lng),
      formattedAddress: [city.trim(), country.trim()].filter(Boolean).join(', ') || undefined,
    };

    try {
      setIsSubmitting(true);
      await onSaveLocation(
        loc,
        modalMode,
        selectedEntryId,
        newTitle.trim() || placeName.trim(),
        category
      );
      onClose();
    } catch (err) {
      console.error('Save location error:', err);
      setGpsNotice('Failed to save location. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemove = async () => {
    try {
      setIsSubmitting(true);
      await onSaveLocation(null, 'tag', selectedEntryId);
      onClose();
    } catch (err) {
      console.error('Remove location error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasMultipleEntries = Boolean(availableEntries && availableEntries.length > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/80 backdrop-blur-sm animate-fadeIn">
      <div 
        className="w-full max-w-lg bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
        aria-labelledby="location-modal-title"
      >
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-stone-800 flex items-center justify-between bg-stone-900/90">
          <div className="flex items-center gap-2.5 min-w-0 pr-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Compass className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 id="location-modal-title" className="text-sm sm:text-base font-semibold text-stone-100 truncate">
                {entryTitle && !hasMultipleEntries
                  ? `Pin Location: ${entryTitle}`
                  : 'Pin Sanctuary to Map'}
              </h3>
              <p className="text-xs text-stone-400 truncate">
                Geotag places of contemplation and visualize them on your Journey Map
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition cursor-pointer shrink-0"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Switcher Tabs (When multiple entries exist) */}
        {hasMultipleEntries && (
          <div className="px-5 pt-3 pb-0 bg-stone-900/60 border-b border-stone-800 flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => setModalMode('create')}
              className={`pb-2.5 px-3 font-medium transition cursor-pointer border-b-2 flex items-center gap-1.5 ${
                modalMode === 'create'
                  ? 'border-amber-500 text-amber-300 font-semibold'
                  : 'border-transparent text-stone-400 hover:text-stone-200'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Pinned Reflection</span>
            </button>
            <button
              type="button"
              onClick={() => setModalMode('tag')}
              className={`pb-2.5 px-3 font-medium transition cursor-pointer border-b-2 flex items-center gap-1.5 ${
                modalMode === 'tag'
                  ? 'border-amber-500 text-amber-300 font-semibold'
                  : 'border-transparent text-stone-400 hover:text-stone-200'
              }`}
            >
              <Tag className="w-3.5 h-3.5" />
              <span>Tag Existing Reflection</span>
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto subtle-scrollbar space-y-4 text-stone-200 text-sm">
          {/* Tag Existing Reflection Selector */}
          {modalMode === 'tag' && hasMultipleEntries && (
            <div>
              <label className="block text-xs font-medium text-stone-300 mb-1.5">
                Choose Reflection to Geotag <span className="text-amber-400">*</span>
              </label>
              <select
                value={selectedEntryId}
                onChange={(e) => handleEntrySelectChange(e.target.value)}
                className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-stone-100 focus:outline-none focus:border-amber-500"
              >
                {availableEntries?.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.title || 'Untitled Reflection'}
                    {e.location ? ` (📍 ${e.location.placeName})` : ' (No pin yet)'}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* New Pinned Reflection Fields */}
          {modalMode === 'create' && (
            <div className="space-y-3 p-3 rounded-xl bg-stone-950/60 border border-stone-800">
              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1">
                  Reflection Title <span className="text-stone-500">(optional)</span>
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Mountain Sanctuary Sunset (defaults to place name)"
                  className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-1.5 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1.5">
                  Category
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs transition cursor-pointer ${
                        category === cat.id
                          ? 'bg-amber-500 text-stone-950 font-semibold'
                          : 'bg-stone-900 text-stone-300 hover:bg-stone-800 border border-stone-700'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Quick GPS Action */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-stone-800/50 border border-stone-700/60">
            <div className="flex items-center gap-2.5 min-w-0">
              <Navigation className={`w-4 h-4 text-amber-400 ${isLocating ? 'animate-spin' : ''}`} />
              <div className="min-w-0">
                <span className="text-xs font-medium text-stone-200 block">Current Location</span>
                <span className="text-[11px] text-stone-400 truncate block">Detect via browser geolocation</span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={isLocating || isSubmitting}
              className="px-3 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-medium hover:bg-amber-500/25 transition cursor-pointer disabled:opacity-50"
            >
              {isLocating ? 'Locating...' : 'Use GPS'}
            </button>
          </div>

          {gpsNotice && (
            <div className={`p-2.5 rounded-lg text-xs ${gpsNotice.includes('accurately') ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60' : 'bg-amber-950/60 text-amber-300 border border-amber-800/60'}`}>
              {gpsNotice}
            </div>
          )}

          {/* Place Name Input */}
          <div>
            <label className="block text-xs font-medium text-stone-300 mb-1.5">
              Place / Sanctuary Name <span className="text-amber-400">*</span>
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-stone-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={placeName}
                onChange={(e) => setPlaceName(e.target.value)}
                placeholder="e.g. Kyoto Zen Garden, Mountain Cabin, Home Sanctuary"
                className="w-full bg-stone-950 border border-stone-700 rounded-xl pl-9 pr-3 py-2 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* City and Country */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-300 mb-1.5">City / Region</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Kyoto, Banff"
                className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-300 mb-1.5">Country</label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="e.g. Japan, Canada"
                className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Coordinates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-300 mb-1.5">Latitude</label>
              <input
                type="number"
                step="any"
                value={lat}
                onChange={(e) => setLat(parseFloat(e.target.value) || 0)}
                className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-sm font-mono text-stone-300 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-300 mb-1.5">Longitude</label>
              <input
                type="number"
                step="any"
                value={lng}
                onChange={(e) => setLng(parseFloat(e.target.value) || 0)}
                className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-sm font-mono text-stone-300 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Curated Presets */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs font-medium text-stone-300">Or choose a contemplative sanctuary:</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
              {INSPIRATIONAL_SANCTUARIES.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className="text-left p-2 rounded-xl bg-stone-950 hover:bg-stone-800/80 border border-stone-800 hover:border-amber-500/30 transition cursor-pointer group"
                >
                  <div className="font-medium text-stone-200 text-xs truncate group-hover:text-amber-300">
                    {preset.name}
                  </div>
                  <div className="text-[10px] text-stone-400 truncate">
                    {preset.city ? `${preset.city}, ` : ''}{preset.country}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 border-t border-stone-800 bg-stone-900/90 flex items-center justify-between gap-2">
          {modalMode === 'tag' && currentLocation ? (
            <button
              type="button"
              onClick={handleRemove}
              disabled={isSubmitting}
              className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-red-950/40 transition cursor-pointer disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Remove Location
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3.5 py-1.5 rounded-xl text-xs text-stone-300 hover:bg-stone-800 transition cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSubmitting}
              className="px-4 py-1.5 rounded-xl bg-amber-500 text-stone-950 text-xs font-semibold hover:bg-amber-400 transition cursor-pointer flex items-center gap-1.5 shadow-md disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Pinning...' : modalMode === 'create' ? 'Create & Pin' : 'Pin Location'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

