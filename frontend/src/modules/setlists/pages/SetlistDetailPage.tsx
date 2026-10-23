import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Play,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Music,
  Search,
  ExternalLink,
  MoreVertical,
  Copy,
  Printer,
  RotateCcw,
  Edit2,
  CheckCircle2,
  PanelRightClose,
  PanelRightOpen,
  ListMusic,
  Sparkles,
} from 'lucide-react';
import {
  getSetlistById,
  addSongToSetlist,
  removeSongFromSetlist,
  reorderSetlistSongs,
  createSetlist,
  updateSetlist,
  type SetlistSongItem,
} from '../api/setlists.api.js';
import { getSongs } from '../../songs/api/songs.api.js';
import { Button } from '../../../components/ui/Button.js';
import { Input } from '../../../components/ui/Input.js';
import { Modal } from '../../../components/ui/Modal.js';
import { SetlistQueuePanel } from '../components/SetlistQueuePanel.js';
import { PerformanceModeModal } from '../../songs/components/PerformanceModeModal.js';
import { cn } from '../../../lib/utils.js';

export const SetlistDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const setlistId = parseInt(id || '0', 10);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Performance sequence and panel state
  const [selectedSongIndex, setSelectedSongIndex] = useState<number>(0);
  const [isQueueOpen, setIsQueueOpen] = useState<boolean>(true);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState<boolean>(false);
  const [isPerformanceOpen, setIsPerformanceOpen] = useState<boolean>(false);

  // Modals & Menu State
  const [isAddSongOpen, setIsAddSongOpen] = useState<boolean>(false);
  const [songSearch, setSongSearch] = useState<string>('');
  const [isEditDetailsOpen, setIsEditDetailsOpen] = useState<boolean>(false);
  const [editName, setEditName] = useState<string>('');
  const [editDescription, setEditDescription] = useState<string>('');
  const [deletingSongItem, setDeletingSongItem] = useState<SetlistSongItem | null>(null);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState<boolean>(false);
  const [copiedToast, setCopiedToast] = useState<boolean>(false);
  const [isDuplicating, setIsDuplicating] = useState<boolean>(false);

  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Fetch active setlist
  const { data: setlist, isLoading } = useQuery({
    queryKey: ['setlist', setlistId],
    queryFn: () => getSetlistById(setlistId),
    enabled: setlistId > 0,
  });

  // Fetch available library songs for adding
  const { data: availableSongs = [] } = useQuery({
    queryKey: ['songs', { search: songSearch }],
    queryFn: () => getSongs({ search: songSearch || undefined }),
    enabled: isAddSongOpen,
  });

  // Clamp selectedSongIndex when setlist songs change
  useEffect(() => {
    if (!setlist) return;
    if (setlist.songs.length === 0) {
      setSelectedSongIndex(0);
    } else if (selectedSongIndex >= setlist.songs.length) {
      setSelectedSongIndex(setlist.songs.length - 1);
    }
  }, [setlist, selectedSongIndex]);

  // Close "More Options" menu when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setIsMoreMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMoreMenuOpen(false);
      }
    };
    if (isMoreMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMoreMenuOpen]);

  // Mutations
  const addSongMutation = useMutation({
    mutationFn: (songId: number) => addSongToSetlist(setlistId, songId, 0),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['setlist', setlistId] });
      queryClient.invalidateQueries({ queryKey: ['setlists'] });
      setIsAddSongOpen(false);
    },
  });

  const removeSongMutation = useMutation({
    mutationFn: (songId: number) => removeSongFromSetlist(setlistId, songId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['setlist', setlistId] });
      queryClient.invalidateQueries({ queryKey: ['setlists'] });
      setDeletingSongItem(null);
      if (setlist && selectedSongIndex >= setlist.songs.length - 1 && selectedSongIndex > 0) {
        setSelectedSongIndex((prev) => Math.max(0, prev - 1));
      }
    },
  });

  const reorderMutation = useMutation({
    mutationFn: (newOrder: number[]) => reorderSetlistSongs(setlistId, newOrder),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['setlist', setlistId] });
    },
  });

  const updateDetailsMutation = useMutation({
    mutationFn: (data: { name: string; description: string | null }) =>
      updateSetlist(setlistId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['setlist', setlistId] });
      queryClient.invalidateQueries({ queryKey: ['setlists'] });
      setIsEditDetailsOpen(false);
    },
  });

  // Reorder song move handler
  const handleMove = (index: number, direction: 'up' | 'down') => {
    if (!setlist || setlist.songs.length <= 1) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= setlist.songs.length) return;

    const reordered = [...setlist.songs];
    const temp = reordered[index];
    reordered[index] = reordered[targetIndex];
    reordered[targetIndex] = temp;

    // Preserve active track selection position
    if (selectedSongIndex === index) {
      setSelectedSongIndex(targetIndex);
    } else if (selectedSongIndex === targetIndex) {
      setSelectedSongIndex(index);
    }

    const songIds = reordered.map((item) => item.song.id);
    reorderMutation.mutate(songIds);
  };

  // Duplicate Setlist
  const handleDuplicateSetlist = async () => {
    if (!setlist) return;
    setIsDuplicating(true);
    try {
      const copyName = `${setlist.name} (Copy)`;
      const newSetlist = await createSetlist({
        name: copyName,
        description: setlist.description,
      });

      // Append songs in identical sequence
      for (const item of setlist.songs) {
        await addSongToSetlist(newSetlist.id, item.song.id, item.transposeOffset || 0);
      }

      queryClient.invalidateQueries({ queryKey: ['setlists'] });
      navigate(`/setlists/${newSetlist.id}`);
    } catch (err) {
      console.error('Failed to duplicate setlist:', err);
    } finally {
      setIsDuplicating(false);
      setIsMoreMenuOpen(false);
    }
  };

  // Copy Song Order to Clipboard
  const handleCopySongOrder = async () => {
    if (!setlist || setlist.songs.length === 0) return;
    const lines = [
      `Setlist: ${setlist.name}`,
      setlist.description ? `Notes: ${setlist.description}` : '',
      '----------------------------------------',
      ...setlist.songs.map((item, idx) => {
        const parts = [`${idx + 1}. ${item.song.title}`];
        if (item.song.artist) parts.push(`- ${item.song.artist}`);
        if (item.song.songKey) parts.push(`(Key: ${item.song.songKey})`);
        if (item.song.tempo) parts.push(`[${item.song.tempo} BPM]`);
        return parts.join(' ');
      }),
    ].filter(Boolean);

    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 3000);
    } catch (err) {
      console.error('Failed to copy song order to clipboard:', err);
    }
    setIsMoreMenuOpen(false);
  };

  // Clear Performance Progress
  const handleClearProgress = () => {
    setSelectedSongIndex(0);
    setIsMoreMenuOpen(false);
  };

  // Open Edit Details Modal
  const handleOpenEditDetails = () => {
    if (!setlist) return;
    setEditName(setlist.name);
    setEditDescription(setlist.description || '');
    setIsEditDetailsOpen(true);
    setIsMoreMenuOpen(false);
  };

  // Print Setlist
  const handlePrintSetlist = () => {
    setIsMoreMenuOpen(false);
    window.print();
  };

  if (isLoading) {
    return (
      <div className="w-full max-w-full space-y-4 animate-pulse">
        <div className="h-8 bg-[#E8F1E9] dark:bg-[#24372C] rounded w-1/4" />
        <div className="h-64 bg-[#E8F1E9] dark:bg-[#24372C] rounded-xl" />
      </div>
    );
  }

  if (!setlist) {
    return (
      <div className="w-full max-w-md mx-auto text-center py-12">
        <p className="text-[#647067] dark:text-[#A8B9AE]">Setlist not found.</p>
        <Link
          to="/setlists"
          className="text-[#198754] dark:text-[#6FCF97] hover:underline mt-2 inline-block font-medium text-sm"
        >
          &larr; Back to setlists
        </Link>
      </div>
    );
  }

  const existingSongIds = setlist.songs.map((s) => s.song.id);
  const totalSongs = setlist.songs.length;
  const currentItem = totalSongs > 0 && selectedSongIndex < totalSongs ? setlist.songs[selectedSongIndex] : null;
  const nextItem = totalSongs > 0 && selectedSongIndex + 1 < totalSongs ? setlist.songs[selectedSongIndex + 1] : null;
  const activePerformanceSong = currentItem ? currentItem.song : null;

  return (
    <div className="w-full max-w-full space-y-6">
      {/* ============================================================== */}
      {/* 1. Header Toolbar (Hidden during Print)                          */}
      {/* ============================================================== */}
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          to="/setlists"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#647067] dark:text-[#A8B9AE] hover:text-[#1C2924] dark:hover:text-[#F0F5F0] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Setlists</span>
        </Link>

        {/* Action Buttons Toolbar */}
        <div className="flex items-center gap-2">
          {/* Start Performance (Visible if setlist has songs) */}
          {totalSongs > 0 && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => setIsPerformanceOpen(true)}
              className="shadow-xs"
              title="Launch full-screen performance mode"
            >
              <Play className="w-3.5 h-3.5 mr-1" />
              <span>Start Performance</span>
            </Button>
          )}

          {/* Add Song */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsAddSongOpen(true)}
            title="Add songs from library"
          >
            <Plus className="w-4 h-4 mr-1" />
            <span>Add Song</span>
          </Button>

          {/* Desktop Queue Panel Toggle */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsQueueOpen(!isQueueOpen)}
            className="hidden lg:inline-flex"
            title={isQueueOpen ? 'Hide right queue panel' : 'Show right queue panel'}
            aria-label="Toggle queue panel"
          >
            {isQueueOpen ? (
              <>
                <PanelRightClose className="w-4 h-4 mr-1 text-[#647067] dark:text-[#A8B9AE]" />
                <span>Hide Queue</span>
              </>
            ) : (
              <>
                <PanelRightOpen className="w-4 h-4 mr-1 text-[#198754] dark:text-[#6FCF97]" />
                <span>Show Queue</span>
              </>
            )}
          </Button>

          {/* Mobile / Tablet Queue Drawer Trigger Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsMobileDrawerOpen(true)}
            className="lg:hidden relative"
            title="Open setlist queue drawer"
          >
            <ListMusic className="w-4 h-4 mr-1 text-[#198754] dark:text-[#6FCF97]" />
            <span>Queue</span>
            {totalSongs > 0 && (
              <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-[#198754] text-white">
                {totalSongs}
              </span>
            )}
          </Button>

          {/* More Options Dropdown */}
          <div className="relative" ref={moreMenuRef}>
            <button
              type="button"
              onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
              className="p-2 rounded-lg border border-[#E4E9E3] dark:border-[#2A4033] bg-white dark:bg-[#17251E] text-[#647067] dark:text-[#A8B9AE] hover:text-[#1C2924] dark:hover:text-[#F0F5F0] hover:bg-[#E8F1E9] dark:hover:bg-[#24372C] transition-colors min-h-[38px] min-w-[38px] flex items-center justify-center shadow-xs"
              title="More setlist options"
              aria-label="More options"
              aria-expanded={isMoreMenuOpen}
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {/* Dropdown Menu */}
            {isMoreMenuOpen && (
              <div
                className="absolute right-0 mt-1.5 w-56 rounded-xl bg-white dark:bg-[#17251E] border border-[#E4E9E3] dark:border-[#2A4033] shadow-lg py-1.5 z-40 animate-fade-in"
                role="menu"
              >
                <button
                  type="button"
                  onClick={handleOpenEditDetails}
                  className="w-full px-3.5 py-2 text-xs text-left text-[#1C2924] dark:text-[#F0F5F0] hover:bg-[#E8F1E9] dark:hover:bg-[#24372C] flex items-center gap-2.5 transition-colors"
                  role="menuitem"
                >
                  <Edit2 className="w-3.5 h-3.5 text-[#647067] dark:text-[#A8B9AE]" />
                  <span>Edit Setlist Details</span>
                </button>

                <button
                  type="button"
                  disabled={isDuplicating}
                  onClick={handleDuplicateSetlist}
                  className="w-full px-3.5 py-2 text-xs text-left text-[#1C2924] dark:text-[#F0F5F0] hover:bg-[#E8F1E9] dark:hover:bg-[#24372C] flex items-center gap-2.5 transition-colors disabled:opacity-50"
                  role="menuitem"
                >
                  <Copy className="w-3.5 h-3.5 text-[#647067] dark:text-[#A8B9AE]" />
                  <span>{isDuplicating ? 'Duplicating...' : 'Duplicate Setlist'}</span>
                </button>

                <button
                  type="button"
                  disabled={totalSongs === 0}
                  onClick={handleCopySongOrder}
                  className="w-full px-3.5 py-2 text-xs text-left text-[#1C2924] dark:text-[#F0F5F0] hover:bg-[#E8F1E9] dark:hover:bg-[#24372C] flex items-center gap-2.5 transition-colors disabled:opacity-50"
                  role="menuitem"
                >
                  <ListMusic className="w-3.5 h-3.5 text-[#647067] dark:text-[#A8B9AE]" />
                  <span>Copy Song Order</span>
                </button>

                <button
                  type="button"
                  disabled={totalSongs === 0 || selectedSongIndex === 0}
                  onClick={handleClearProgress}
                  className="w-full px-3.5 py-2 text-xs text-left text-[#1C2924] dark:text-[#F0F5F0] hover:bg-[#E8F1E9] dark:hover:bg-[#24372C] flex items-center gap-2.5 transition-colors disabled:opacity-50"
                  role="menuitem"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-[#647067] dark:text-[#A8B9AE]" />
                  <span>Clear Performance Progress</span>
                </button>

                <div className="my-1 border-t border-[#E4E9E3] dark:border-[#2A4033]" />

                <button
                  type="button"
                  onClick={handlePrintSetlist}
                  className="w-full px-3.5 py-2 text-xs text-left text-[#1C2924] dark:text-[#F0F5F0] hover:bg-[#E8F1E9] dark:hover:bg-[#24372C] flex items-center gap-2.5 transition-colors"
                  role="menuitem"
                >
                  <Printer className="w-3.5 h-3.5 text-[#647067] dark:text-[#A8B9AE]" />
                  <span>Print Setlist Sheet</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Clipboard Toast Banner */}
      {copiedToast && (
        <div className="p-3 bg-[#E8F1E9] dark:bg-[#24372C] border border-[#198754] dark:border-[#6FCF97] rounded-xl text-xs font-semibold text-[#146C43] dark:text-[#6FCF97] flex items-center gap-2 shadow-2xs animate-fade-in print:hidden">
          <CheckCircle2 className="w-4 h-4" />
          <span>Setlist song sequence copied to clipboard!</span>
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. Responsive Workspace: Main List + Docked Queue Panel         */}
      {/* ============================================================== */}
      <div className="flex flex-col lg:flex-row gap-6 items-start w-full">
        {/* Left Column: Setlist Header Card & Main Song List */}
        <div className="flex-1 min-w-0 w-full space-y-4">
          {/* Setlist Info Card */}
          <div className="w-full bg-white dark:bg-[#17251E] rounded-2xl border border-[#E4E9E3] dark:border-[#2A4033] p-5 sm:p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-bold text-[#1C2924] dark:text-[#F0F5F0] tracking-tight">
                    {setlist.name}
                  </h1>
                  <button
                    type="button"
                    onClick={handleOpenEditDetails}
                    className="p-1 rounded-md text-[#647067] dark:text-[#A8B9AE] hover:text-[#198754] hover:bg-[#E8F1E9] dark:hover:bg-[#24372C] transition-colors print:hidden"
                    title="Edit setlist title and description"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {setlist.description && (
                  <p className="text-sm text-[#647067] dark:text-[#A8B9AE] mt-1.5 leading-relaxed">
                    {setlist.description}
                  </p>
                )}
              </div>

              {/* Status Pills */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-[#FAFAF6] dark:bg-[#101A16] border border-[#E4E9E3] dark:border-[#2A4033] text-[#647067] dark:text-[#A8B9AE]">
                  {totalSongs} {totalSongs === 1 ? 'song' : 'songs'}
                </span>
                {totalSongs > 0 && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-[#E8F1E9] dark:bg-[#24372C] text-[#146C43] dark:text-[#6FCF97] border border-[#198754]/20">
                    Track {selectedSongIndex + 1} of {totalSongs}
                  </span>
                )}
              </div>
            </div>

            {/* Mobile / Compact Now-Playing Banner (Visible when queue panel is collapsed or on smaller screens) */}
            {currentItem && (!isQueueOpen || totalSongs > 0) && (
              <div className="mt-4 pt-4 border-t border-[#E4E9E3] dark:border-[#2A4033] flex flex-wrap items-center justify-between gap-3 text-xs bg-[#FAFAF6] dark:bg-[#101A16] p-3 rounded-xl lg:hidden">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-6 h-6 rounded-full bg-[#198754] text-white flex items-center justify-center font-mono font-bold text-[10px] shrink-0">
                    <Sparkles className="w-3 h-3" />
                  </span>
                  <div className="min-w-0">
                    <span className="font-semibold text-[#1C2924] dark:text-[#F0F5F0] truncate block">
                      Now: {currentItem.song.title}
                    </span>
                    <span className="text-[11px] text-[#647067] dark:text-[#A8B9AE] truncate block">
                      {currentItem.song.artist || 'Unknown'} {currentItem.song.songKey ? `• Key: ${currentItem.song.songKey}` : ''}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-auto">
                  {nextItem && (
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedSongIndex < totalSongs - 1) {
                          setSelectedSongIndex(selectedSongIndex + 1);
                        }
                      }}
                      className="text-xs font-medium text-[#198754] dark:text-[#6FCF97] hover:underline"
                    >
                      Next: {nextItem.song.title} &rarr;
                    </button>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="primary"
                    onClick={() => setIsPerformanceOpen(true)}
                    className="py-1 px-2.5 text-xs"
                  >
                    <Play className="w-3 h-3 mr-1" />
                    Perform
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Song Sequence List */}
          <div className="w-full space-y-2">
            {totalSongs === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-[#E4E9E3] dark:border-[#2A4033] rounded-2xl p-6 bg-white/40 dark:bg-[#17251E]/40">
                <Music className="w-8 h-8 text-[#198754] dark:text-[#6FCF97] mx-auto mb-2 opacity-60" />
                <h3 className="font-semibold text-sm text-[#1C2924] dark:text-[#F0F5F0]">
                  Setlist is currently empty
                </h3>
                <p className="text-xs text-[#647067] dark:text-[#A8B9AE] mt-1 mb-4">
                  Add songs from your library to start building your live setlist.
                </p>
                <Button size="sm" onClick={() => setIsAddSongOpen(true)}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add First Song
                </Button>
              </div>
            ) : (
              setlist.songs.map((item, idx) => {
                const isSelected = idx === selectedSongIndex;
                const isPast = idx < selectedSongIndex;

                return (
                  <div
                    key={item.song.id}
                    onClick={() => setSelectedSongIndex(idx)}
                    className={cn(
                      'group rounded-xl border p-4 flex items-center justify-between gap-3 shadow-2xs transition-all cursor-pointer',
                      isSelected
                        ? 'bg-[#E8F1E9]/60 dark:bg-[#24372C]/50 border-[#198754] dark:border-[#6FCF97] ring-1 ring-[#198754]/30'
                        : isPast
                        ? 'bg-white/80 dark:bg-[#17251E]/80 border-[#E4E9E3] dark:border-[#2A4033] hover:border-[#198754]/50'
                        : 'bg-white dark:bg-[#17251E] border-[#E4E9E3] dark:border-[#2A4033] hover:border-[#198754] dark:hover:border-[#6FCF97]'
                    )}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      {/* Track number badge / status */}
                      <span
                        className={cn(
                          'w-8 h-8 rounded-full font-mono text-xs font-bold flex items-center justify-center shrink-0 transition-colors',
                          isSelected
                            ? 'bg-[#198754] text-white shadow-2xs'
                            : isPast
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                            : 'bg-[#FAFAF6] dark:bg-[#101A16] text-[#647067] dark:text-[#A8B9AE] border border-[#E4E9E3] dark:border-[#2A4033]'
                        )}
                      >
                        {isPast ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                      </span>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={cn(
                              'font-bold text-sm truncate',
                              isSelected
                                ? 'text-[#146C43] dark:text-[#6FCF97]'
                                : 'text-[#1C2924] dark:text-[#F0F5F0]'
                            )}
                          >
                            {item.song.title}
                          </span>

                          {isSelected && (
                            <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#198754] text-white">
                              Active Track
                            </span>
                          )}

                          {item.song.songKey && (
                            <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-[#FAFAF6] dark:bg-[#101A16] text-[#647067] dark:text-[#A8B9AE] border border-[#E4E9E3] dark:border-[#2A4033]">
                              Key: {item.song.songKey}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-[#647067] dark:text-[#A8B9AE] mt-0.5">
                          <span className="truncate">{item.song.artist || 'Unknown Artist'}</span>
                          {item.song.tempo && (
                            <span className="inline-flex items-center gap-0.5 font-mono">
                              &bull; {item.song.tempo} BPM
                            </span>
                          )}
                          {item.song.capo > 0 && (
                            <span className="inline-flex items-center gap-0.5 font-mono">
                              &bull; Capo {item.song.capo}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Controls */}
                    <div
                      className="flex items-center gap-1 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Play / Perform */}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSongIndex(idx);
                          setIsPerformanceOpen(true);
                        }}
                        className="p-2 rounded-lg text-[#198754] dark:text-[#6FCF97] hover:bg-[#E8F1E9] dark:hover:bg-[#24372C] min-h-[38px] min-w-[38px] flex items-center justify-center transition-colors"
                        title="Perform this song"
                        aria-label={`Perform ${item.song.title}`}
                      >
                        <Play className="w-4 h-4" />
                      </button>

                      {/* Move Up */}
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMove(idx, 'up')}
                        className="p-2 rounded-lg text-[#647067] dark:text-[#A8B9AE] hover:bg-[#E8F1E9] dark:hover:bg-[#24372C] hover:text-[#1C2924] dark:hover:text-[#F0F5F0] disabled:opacity-20 min-h-[38px] min-w-[38px] flex items-center justify-center transition-colors"
                        title="Move up in setlist"
                        aria-label={`Move ${item.song.title} up`}
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>

                      {/* Move Down */}
                      <button
                        type="button"
                        disabled={idx === totalSongs - 1}
                        onClick={() => handleMove(idx, 'down')}
                        className="p-2 rounded-lg text-[#647067] dark:text-[#A8B9AE] hover:bg-[#E8F1E9] dark:hover:bg-[#24372C] hover:text-[#1C2924] dark:hover:text-[#F0F5F0] disabled:opacity-20 min-h-[38px] min-w-[38px] flex items-center justify-center transition-colors"
                        title="Move down in setlist"
                        aria-label={`Move ${item.song.title} down`}
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>

                      {/* View Song Sheet */}
                      <Link
                        to={`/songs/${item.song.id}`}
                        className="p-2 rounded-lg text-[#647067] dark:text-[#A8B9AE] hover:text-[#198754] dark:hover:text-[#6FCF97] hover:bg-[#E8F1E9] dark:hover:bg-[#24372C] min-h-[38px] min-w-[38px] flex items-center justify-center transition-colors"
                        title="Open full chord sheet"
                        aria-label={`View full sheet for ${item.song.title}`}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Link>

                      {/* Remove Song from Setlist */}
                      <button
                        type="button"
                        onClick={() => setDeletingSongItem(item)}
                        className="p-2 rounded-lg text-[#647067] dark:text-[#A8B9AE] hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 min-h-[38px] min-w-[38px] flex items-center justify-center transition-colors"
                        title="Remove from setlist"
                        aria-label={`Remove ${item.song.title} from setlist`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ============================================================== */}
        {/* Right Column: Docked Queue Panel on Large Screens (>= 1024px)   */}
        {/* ============================================================== */}
        {isQueueOpen && (
          <div className="hidden lg:block w-80 xl:w-96 shrink-0 sticky top-20 max-h-[calc(100vh-6rem)] print:hidden">
            <SetlistQueuePanel
              setlist={setlist}
              currentSongIndex={selectedSongIndex}
              onSelectSongIndex={(idx) => setSelectedSongIndex(idx)}
              onNextSong={() => {
                if (selectedSongIndex < totalSongs - 1) {
                  setSelectedSongIndex(selectedSongIndex + 1);
                }
              }}
              onPrevSong={() => {
                if (selectedSongIndex > 0) {
                  setSelectedSongIndex(selectedSongIndex - 1);
                }
              }}
              hasNext={selectedSongIndex < totalSongs - 1}
              hasPrev={selectedSongIndex > 0}
              onStartPerformance={(idx) => {
                if (typeof idx === 'number') setSelectedSongIndex(idx);
                setIsPerformanceOpen(true);
              }}
              onMoveSong={handleMove}
              onAddSongClick={() => setIsAddSongOpen(true)}
              isOpen={isQueueOpen}
              onClose={() => setIsQueueOpen(false)}
            />
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* 3. Mobile / Tablet Queue Drawer (Slide-out modal with backdrop)  */}
      {/* ============================================================== */}
      <SetlistQueuePanel
        setlist={setlist}
        currentSongIndex={selectedSongIndex}
        onSelectSongIndex={(idx) => {
          setSelectedSongIndex(idx);
          setIsMobileDrawerOpen(false);
        }}
        onNextSong={() => {
          if (selectedSongIndex < totalSongs - 1) {
            setSelectedSongIndex(selectedSongIndex + 1);
          }
        }}
        onPrevSong={() => {
          if (selectedSongIndex > 0) {
            setSelectedSongIndex(selectedSongIndex - 1);
          }
        }}
        hasNext={selectedSongIndex < totalSongs - 1}
        hasPrev={selectedSongIndex > 0}
        onStartPerformance={(idx) => {
          if (typeof idx === 'number') setSelectedSongIndex(idx);
          setIsMobileDrawerOpen(false);
          setIsPerformanceOpen(true);
        }}
        onMoveSong={handleMove}
        onAddSongClick={() => {
          setIsMobileDrawerOpen(false);
          setIsAddSongOpen(true);
        }}
        isOpen={isMobileDrawerOpen}
        onClose={() => setIsMobileDrawerOpen(false)}
        isMobileDrawer={true}
      />

      {/* ============================================================== */}
      {/* 4. Modals and Dialogs                                           */}
      {/* ============================================================== */}

      {/* Add Song Modal */}
      <Modal
        isOpen={isAddSongOpen}
        onClose={() => setIsAddSongOpen(false)}
        title="Add Song to Setlist"
        description="Select songs from your library to append to this setlist."
        maxWidth="lg"
      >
        <div className="space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-[#647067] dark:text-[#A8B9AE] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter library songs..."
              value={songSearch}
              onChange={(e) => setSongSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-[#E4E9E3] dark:border-[#2A4033] bg-[#FAFAF6] dark:bg-[#101A16] text-[#1C2924] dark:text-[#F0F5F0] placeholder:text-[#647067] dark:placeholder:text-[#A8B9AE] focus:outline-none focus:ring-2 focus:ring-[#198754] dark:focus:ring-[#6FCF97]"
            />
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-[#E4E9E3] dark:divide-[#2A4033] border border-[#E4E9E3] dark:border-[#2A4033] rounded-xl bg-white dark:bg-[#17251E]">
            {availableSongs.length === 0 ? (
              <p className="text-center py-6 text-xs text-[#647067] dark:text-[#A8B9AE]">
                No matching songs found
              </p>
            ) : (
              availableSongs.map((s) => {
                const isAlreadyIn = existingSongIds.includes(s.id);
                return (
                  <div
                    key={s.id}
                    className="p-3 flex items-center justify-between hover:bg-[#E8F1E9]/50 dark:hover:bg-[#24372C]/50"
                  >
                    <div>
                      <h4 className="text-sm font-semibold text-[#1C2924] dark:text-[#F0F5F0]">
                        {s.title}
                      </h4>
                      <p className="text-xs text-[#647067] dark:text-[#A8B9AE]">
                        {s.artist || 'Unknown Artist'} {s.songKey ? `• Key: ${s.songKey}` : ''}
                      </p>
                    </div>

                    <Button
                      size="sm"
                      variant={isAlreadyIn ? 'secondary' : 'primary'}
                      disabled={isAlreadyIn || addSongMutation.isPending}
                      onClick={() => addSongMutation.mutate(s.id)}
                    >
                      {isAlreadyIn ? 'Added' : 'Add'}
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </Modal>

      {/* Edit Setlist Details Modal */}
      <Modal
        isOpen={isEditDetailsOpen}
        onClose={() => setIsEditDetailsOpen(false)}
        title="Edit Setlist Details"
        description="Update the setlist name and performance notes."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!editName.trim()) return;
            updateDetailsMutation.mutate({
              name: editName.trim(),
              description: editDescription.trim() || null,
            });
          }}
          className="space-y-4"
        >
          <Input
            label="Setlist Name *"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            placeholder="e.g. Sunday Morning Worship"
            required
          />

          <div>
            <label className="block text-sm font-medium text-[#1C2924] dark:text-[#F0F5F0] mb-1">
              Description / Performance Notes (Optional)
            </label>
            <textarea
              rows={3}
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="e.g. Rehearsal at 8:00 AM. Acoustic intro for song 1."
              className="w-full rounded-lg border border-[#E4E9E3] dark:border-[#2A4033] px-3 py-2 text-sm bg-white dark:bg-[#17251E] text-[#1C2924] dark:text-[#F0F5F0] placeholder:text-[#647067] dark:placeholder:text-[#A8B9AE] focus:outline-none focus:ring-2 focus:ring-[#198754] dark:focus:ring-[#6FCF97] resize-y"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-[#E4E9E3] dark:border-[#2A4033]">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditDetailsOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={updateDetailsMutation.isPending}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Remove Song Safety Dialog */}
      <Modal
        isOpen={Boolean(deletingSongItem)}
        onClose={() => setDeletingSongItem(null)}
        title="Remove Song from Setlist"
        description="Confirm removal of this song from the setlist sequence."
      >
        <div className="space-y-4">
          <div className="p-3.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 rounded-xl text-xs text-amber-900 dark:text-amber-300">
            <p className="font-semibold mb-1">
              Removing &quot;{deletingSongItem?.song.title}&quot; from &quot;{setlist.name}&quot;
            </p>
            <p className="text-amber-800/90 dark:text-amber-400">
              This will only remove the song from this performance setlist. The song, its chords,
              and its lyrics will remain completely safe in your Songbook Library.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-[#E4E9E3] dark:border-[#2A4033]">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeletingSongItem(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              isLoading={removeSongMutation.isPending}
              onClick={() => {
                if (deletingSongItem) {
                  removeSongMutation.mutate(deletingSongItem.song.id);
                }
              }}
            >
              Remove from Setlist
            </Button>
          </div>
        </div>
      </Modal>

      {/* ============================================================== */}
      {/* 5. Synchronized Full-Screen Performance Mode                    */}
      {/* ============================================================== */}
      {activePerformanceSong && (
        <PerformanceModeModal
          song={activePerformanceSong}
          initialOffset={currentItem?.transposeOffset || 0}
          isOpen={isPerformanceOpen}
          onClose={() => setIsPerformanceOpen(false)}
          setlistName={setlist.name}
          setlistSongs={setlist.songs}
          currentSongIndex={selectedSongIndex}
          onSelectSongIndex={(idx) => setSelectedSongIndex(idx)}
          onNextSong={() => {
            if (selectedSongIndex < totalSongs - 1) {
              setSelectedSongIndex(selectedSongIndex + 1);
            }
          }}
          onPrevSong={() => {
            if (selectedSongIndex > 0) {
              setSelectedSongIndex(selectedSongIndex - 1);
            }
          }}
          hasNextSong={selectedSongIndex < totalSongs - 1}
          hasPrevSong={selectedSongIndex > 0}
        />
      )}

      {/* ============================================================== */}
      {/* 6. Clean Printable Setlist Sheet (@media print only)           */}
      {/* ============================================================== */}
      <div className="hidden print:block text-black">
        <div className="border-b-2 border-black pb-3 mb-4">
          <h1 className="text-2xl font-bold tracking-tight">{setlist.name}</h1>
          {setlist.description && <p className="text-sm mt-1">{setlist.description}</p>}
          <p className="text-xs text-gray-600 mt-1">
            Total Songs: {totalSongs} &bull; Printed: {new Date().toLocaleDateString()}
          </p>
        </div>

        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b border-gray-400 text-xs uppercase font-semibold">
              <th className="py-2 w-10">#</th>
              <th className="py-2">Song Title</th>
              <th className="py-2">Artist</th>
              <th className="py-2 w-16">Key</th>
              <th className="py-2 w-16">Capo</th>
              <th className="py-2 w-20">Tempo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {setlist.songs.map((item, idx) => (
              <tr key={item.song.id}>
                <td className="py-2.5 font-mono font-bold">{idx + 1}</td>
                <td className="py-2.5 font-semibold">{item.song.title}</td>
                <td className="py-2.5 text-gray-700">{item.song.artist || '—'}</td>
                <td className="py-2.5 font-mono">{item.song.songKey || '—'}</td>
                <td className="py-2.5 font-mono">{item.song.capo > 0 ? item.song.capo : '—'}</td>
                <td className="py-2.5 font-mono">{item.song.tempo ? `${item.song.tempo} BPM` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
