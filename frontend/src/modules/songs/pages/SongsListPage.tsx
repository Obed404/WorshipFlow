import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, Plus, RotateCcw, Music, AlertCircle, Star, BookOpen, Upload, Check } from 'lucide-react';
import { getSongs, importSongsApi } from '../api/songs.api.js';
import { getLabels } from '../../labels/api/labels.api.js';
import { SongCard } from '../components/SongCard.js';
import { Button } from '../../../components/ui/Button.js';
import { Modal } from '../../../components/ui/Modal.js';
import { EmptyState } from '../../../components/ui/EmptyState.js';
import { useFavorites } from '../../../lib/hooks/useFavorites.js';
import { cn } from '../../../lib/utils.js';

export const SongsListPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialFilter = searchParams.get('filter') === 'favorites' ? 'favorites' : 'all';

  const [filterMode, setFilterMode] = useState<'all' | 'favorites'>(initialFilter);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedLabelIds, setSelectedLabelIds] = useState<number[]>([]);

  const queryClient = useQueryClient();
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [conflictMode, setConflictMode] = useState<'keep_both' | 'overwrite' | 'skip'>('keep_both');
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccessMessage, setImportSuccessMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { favorites, isFavorite, toggleFavorite } = useFavorites();

  // Sync filter mode with URL params
  useEffect(() => {
    const param = searchParams.get('filter');
    if (param === 'favorites') {
      setFilterMode('favorites');
    }
  }, [searchParams]);

  // 300ms debounce for search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Query songs
  const {
    data: songs = [],
    isLoading: isSongsLoading,
    isError: isSongsError,
    error: songsError,
    refetch: refetchSongs,
  } = useQuery({
    queryKey: ['songs', { search: debouncedSearch, labelIds: selectedLabelIds }],
    queryFn: () =>
      getSongs({
        search: debouncedSearch || undefined,
        labelIds: selectedLabelIds.length > 0 ? selectedLabelIds.join(',') : undefined,
      }),
  });

  // Query labels for filtering chips
  const { data: labels = [] } = useQuery({
    queryKey: ['labels'],
    queryFn: () => getLabels(),
  });

  const toggleLabel = (labelId: number) => {
    setSelectedLabelIds((prev) =>
      prev.includes(labelId) ? prev.filter((id) => id !== labelId) : [...prev, labelId]
    );
  };

  const handleClearFilters = () => {
    setSearchInput('');
    setDebouncedSearch('');
    setSelectedLabelIds([]);
  };

  const handleTabChange = (mode: 'all' | 'favorites') => {
    setFilterMode(mode);
    if (mode === 'favorites') {
      setSearchParams({ filter: 'favorites' });
    } else {
      setSearchParams({});
    }
  };

  // Filter songs by tab mode
  const displayedSongs = songs.filter((s) => {
    if (filterMode === 'favorites') {
      return isFavorite(s.id);
    }
    return true;
  });

  const hasActiveFilters = Boolean(searchInput || selectedLabelIds.length > 0);

  return (
    <div className="w-full max-w-full space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1C2924] dark:text-[#F0F5F0] tracking-tight">
            Songbook Library
          </h1>
          <p className="text-sm text-[#647067] dark:text-[#A8B9AE] mt-1">
            Browse, search, and transpose songs for any instrument.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setIsImportModalOpen(true);
              setImportError(null);
              setImportSuccessMessage(null);
            }}
          >
            <Upload className="w-4 h-4" />
            <span>Import</span>
          </Button>
          <Link to="/songs/new">
            <Button>
              <Plus className="w-4 h-4" />
              Add Song
            </Button>
          </Link>
        </div>
      </div>

      {/* View Switcher Tabs: All Songs vs Favorites */}
      <div className="flex items-center gap-1 bg-[#E8F1E9] dark:bg-[#24372C] p-1 rounded-xl w-fit">
        <button
          type="button"
          onClick={() => handleTabChange('all')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
            filterMode === 'all'
              ? 'bg-white dark:bg-[#17251E] text-[#1C2924] dark:text-[#F0F5F0] shadow-xs'
              : 'text-[#647067] dark:text-[#A8B9AE] hover:text-[#1C2924] dark:hover:text-[#F0F5F0]'
          )}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>All Songs</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#FAFAF6] dark:bg-[#101A16] text-[#647067] dark:text-[#A8B9AE] ml-1">
            {songs.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('favorites')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
            filterMode === 'favorites'
              ? 'bg-white dark:bg-[#17251E] text-[#198754] dark:text-[#6FCF97] shadow-xs'
              : 'text-[#647067] dark:text-[#A8B9AE] hover:text-[#198754] dark:hover:text-[#6FCF97]'
          )}
        >
          <Star className={cn('w-3.5 h-3.5', filterMode === 'favorites' && 'fill-[#198754] text-[#198754] dark:fill-[#6FCF97] dark:text-[#6FCF97]')} />
          <span>Favorites</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#FAFAF6] dark:bg-[#101A16] text-[#647067] dark:text-[#A8B9AE] ml-1">
            {favorites.length}
          </span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-[#17251E] rounded-xl border border-[#E4E9E3] dark:border-[#2A4033] p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#647067] dark:text-[#A8B9AE]" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by song title or artist..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-[#FAFAF6] dark:bg-[#101A16] border border-[#E4E9E3] dark:border-[#2A4033] text-[#1C2924] dark:text-[#F0F5F0] placeholder:text-[#647067] dark:placeholder:text-[#A8B9AE] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#198754] dark:focus:ring-[#6FCF97] focus:bg-white dark:focus:bg-[#17251E] transition-colors"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#647067] dark:text-[#A8B9AE] hover:text-[#1C2924] dark:hover:text-[#F0F5F0] p-1"
              >
                Clear
              </button>
            )}
          </div>

          {hasActiveFilters && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="text-xs shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              Reset
            </Button>
          )}
        </div>

        {/* Multi-select Label Chips */}
        {labels.length > 0 && (
          <div className="pt-2 border-t border-[#E4E9E3] dark:border-[#2A4033] flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-medium text-[#647067] dark:text-[#A8B9AE] mr-1">Labels:</span>
            {labels.map((label) => {
              const isSelected = selectedLabelIds.includes(label.id);
              return (
                <button
                  key={label.id}
                  type="button"
                  onClick={() => toggleLabel(label.id)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                    isSelected
                      ? 'bg-[#198754] text-white shadow-xs'
                      : 'bg-[#E8F1E9] dark:bg-[#24372C] text-[#1C2924] dark:text-[#F0F5F0] hover:bg-[#d8e7da] dark:hover:bg-[#2f4639]'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isSelected ? 'bg-white' : 'bg-[#198754] dark:bg-[#6FCF97]'
                    }`}
                  />
                  {label.name}
                  {label.songCount > 0 && (
                    <span
                      className={`text-[10px] px-1 rounded-full ${
                        isSelected
                          ? 'bg-[#146C43] text-white'
                          : 'bg-[#FAFAF6] dark:bg-[#101A16] text-[#647067] dark:text-[#A8B9AE]'
                      }`}
                    >
                      {label.songCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Loading State */}
      {isSongsLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 w-full">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
            <div
              key={i}
              className="bg-white dark:bg-[#17251E] rounded-xl border border-[#E4E9E3] dark:border-[#2A4033] p-5 shadow-xs animate-pulse space-y-4"
            >
              <div className="h-5 bg-[#E8F1E9] dark:bg-[#24372C] rounded w-3/4" />
              <div className="h-4 bg-[#E8F1E9] dark:bg-[#24372C] rounded w-1/2" />
              <div className="flex gap-2">
                <div className="h-6 bg-[#E8F1E9] dark:bg-[#24372C] rounded w-16" />
                <div className="h-6 bg-[#E8F1E9] dark:bg-[#24372C] rounded w-16" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {isSongsError && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-[#D92D20] mx-auto" />
          <h3 className="text-base font-semibold text-[#D92D20] dark:text-[#F87171]">Failed to load songs</h3>
          <p className="text-sm text-red-600 dark:text-red-400">
            {songsError instanceof Error ? songsError.message : 'Please check your connection.'}
          </p>
          <Button variant="outline" size="sm" onClick={() => refetchSongs()}>
            Retry
          </Button>
        </div>
      )}

      {/* Empty State */}
      {!isSongsLoading && !isSongsError && displayedSongs.length === 0 && (
        <EmptyState
          icon={filterMode === 'favorites' ? <Star className="w-8 h-8 text-[#198754] dark:text-[#6FCF97]" /> : <Music className="w-8 h-8 text-[#198754] dark:text-[#6FCF97]" />}
          title={
            filterMode === 'favorites'
              ? 'No favorite songs yet'
              : hasActiveFilters
              ? 'No matching songs found'
              : 'No songs in your library yet'
          }
          description={
            filterMode === 'favorites'
              ? 'Click the star icon on any song to add it to your favorites for quick access.'
              : hasActiveFilters
              ? 'Try modifying your search or clearing filters to see more results.'
              : 'Add your first song with inline chord notation to begin transposing and organizing your digital songbook.'
          }
          action={
            filterMode === 'favorites' ? (
              <Button variant="outline" size="sm" onClick={() => handleTabChange('all')}>
                View All Songs
              </Button>
            ) : hasActiveFilters ? (
              <Button variant="outline" size="sm" onClick={handleClearFilters}>
                Clear All Filters
              </Button>
            ) : (
              <Link to="/songs/new">
                <Button size="sm">
                  <Plus className="w-4 h-4" />
                  Add First Song
                </Button>
              </Link>
            )
          }
        />
      )}

      {/* Song Cards Grid */}
      {!isSongsLoading && !isSongsError && displayedSongs.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 w-full">
          {displayedSongs.map((song) => (
            <SongCard
              key={song.id}
              song={song}
              isFavorite={isFavorite(song.id)}
              onToggleFavorite={toggleFavorite}
            />
          ))}
        </div>
      )}

      {/* Import Songs Modal */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Import WorshipFlow Songs"
        description="Upload a .worshipflow or .json song file, or paste structured song JSON."
        maxWidth="lg"
      >
        <div className="space-y-4 pt-2">
          {importSuccessMessage && (
            <div className="p-3 bg-[#E8F1E9] dark:bg-[#24372C] border border-[#198754]/30 text-[#146C43] dark:text-[#4ADE80] rounded-xl flex items-center gap-2 text-xs">
              <Check className="w-4 h-4 shrink-0" />
              <span>{importSuccessMessage}</span>
            </div>
          )}

          {importError && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-[#D92D20] dark:text-[#F87171] rounded-xl flex items-center gap-2 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{importError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#647067] dark:text-[#A8B9AE] mb-1.5">
              Select File (.worshipflow, .json)
            </label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-4 h-4 mr-1.5" />
                Choose File
              </Button>
              <span className="text-xs text-[#647067] dark:text-[#A8B9AE]">
                {fileInputRef.current?.files?.[0]?.name || 'No file chosen'}
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".worshipflow,.json,application/json"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    const text = await file.text();
                    setImportJsonText(text);
                    setImportError(null);
                  } catch {
                    setImportError('Failed to read chosen file');
                  }
                }}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#647067] dark:text-[#A8B9AE] mb-1.5">
              Or Paste JSON Content
            </label>
            <textarea
              rows={6}
              value={importJsonText}
              onChange={(e) => setImportJsonText(e.target.value)}
              placeholder='{"format": "worshipflow-song", "version": 1, "song": { "title": "Amazing Grace", ... }}'
              className="w-full rounded-xl border border-[#E4E9E3] dark:border-[#2A4033] p-3 font-mono text-xs bg-[#FAFAF6] dark:bg-[#101A16] text-[#1C2924] dark:text-[#F0F5F0] focus:outline-none focus:ring-2 focus:ring-[#198754] resize-y"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#647067] dark:text-[#A8B9AE] mb-1.5">
              If Song Title Already Exists:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'keep_both', label: 'Keep Both (Suffix)' },
                { id: 'overwrite', label: 'Overwrite Existing' },
                { id: 'skip', label: 'Skip Duplicate' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setConflictMode(opt.id as any)}
                  className={cn(
                    'p-2.5 rounded-xl border text-xs font-medium transition-all text-center',
                    conflictMode === opt.id
                      ? 'border-[#198754] dark:border-[#6FCF97] bg-[#E8F1E9] dark:bg-[#24372C] text-[#146C43] dark:text-[#F0F5F0] font-semibold'
                      : 'border-[#E4E9E3] dark:border-[#2A4033] text-[#647067] dark:text-[#A8B9AE]'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#E4E9E3] dark:border-[#2A4033]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsImportModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={!importJsonText.trim()}
              isLoading={isImporting}
              onClick={async () => {
                try {
                  setIsImporting(true);
                  setImportError(null);
                  const parsed = JSON.parse(importJsonText);
                  const res = await importSongsApi(parsed, conflictMode);
                  setImportSuccessMessage(res.message || 'Songs imported successfully');
                  queryClient.invalidateQueries({ queryKey: ['songs'] });
                  queryClient.invalidateQueries({ queryKey: ['labels'] });
                  setTimeout(() => {
                    setIsImportModalOpen(false);
                    setImportJsonText('');
                    setImportSuccessMessage(null);
                  }, 1200);
                } catch (err: any) {
                  setImportError(err?.message || 'Invalid JSON format or structure');
                } finally {
                  setIsImporting(false);
                }
              }}
            >
              Import Now
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
