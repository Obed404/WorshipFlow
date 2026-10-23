import React, { useEffect } from 'react';
import {
  Play,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Music,
  CheckCircle2,
  Sparkles,
  X,
  ListMusic,
  Plus,
  Hash,
  Gauge,
} from 'lucide-react';
import type { SetlistWithSongs } from '../api/setlists.api.js';
import { Button } from '../../../components/ui/Button.js';
import { cn } from '../../../lib/utils.js';

export interface SetlistQueuePanelProps {
  setlist: SetlistWithSongs;
  currentSongIndex: number;
  onSelectSongIndex: (index: number) => void;
  onNextSong: () => void;
  onPrevSong: () => void;
  hasNext: boolean;
  hasPrev: boolean;
  onStartPerformance: (index?: number) => void;
  onMoveSong?: (index: number, direction: 'up' | 'down') => void;
  onAddSongClick?: () => void;
  isOpen: boolean;
  onClose: () => void;
  isMobileDrawer?: boolean;
  className?: string;
}

export const SetlistQueuePanel: React.FC<SetlistQueuePanelProps> = ({
  setlist,
  currentSongIndex,
  onSelectSongIndex,
  onNextSong,
  onPrevSong,
  hasNext,
  hasPrev,
  onStartPerformance,
  onMoveSong,
  onAddSongClick,
  isOpen,
  onClose,
  isMobileDrawer = false,
  className = '',
}) => {
  // Close drawer on Escape key if open in mobile mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && isMobileDrawer) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isMobileDrawer, onClose]);

  const totalSongs = setlist.songs.length;
  const currentItem = totalSongs > 0 && currentSongIndex < totalSongs ? setlist.songs[currentSongIndex] : null;
  const nextItem = totalSongs > 0 && currentSongIndex + 1 < totalSongs ? setlist.songs[currentSongIndex + 1] : null;

  const panelContent = (
    <div className="flex flex-col h-full bg-white dark:bg-[#17251E] rounded-2xl border border-[#E4E9E3] dark:border-[#2A4033] shadow-xs overflow-hidden">
      {/* 1. Header */}
      <div className="p-4 border-b border-[#E4E9E3] dark:border-[#2A4033] flex items-center justify-between gap-2 shrink-0 bg-[#FAFAF6] dark:bg-[#101A16]">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-[#198754] text-white flex items-center justify-center shrink-0 shadow-xs">
            <ListMusic className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-sm text-[#1C2924] dark:text-[#F0F5F0] truncate">
              Setlist Queue
            </h3>
            <p className="text-[11px] text-[#647067] dark:text-[#A8B9AE] truncate">
              {setlist.name} &bull; {totalSongs} {totalSongs === 1 ? 'song' : 'songs'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-[#647067] dark:text-[#A8B9AE] hover:text-[#1C2924] dark:hover:text-[#F0F5F0] hover:bg-[#E8F1E9] dark:hover:bg-[#24372C] transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
          title="Close queue panel"
          aria-label="Close queue panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 2. Scrollable Body: Now Playing, Up Next, and Sequence List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {totalSongs === 0 ? (
          <div className="text-center py-8 text-xs text-[#647067] dark:text-[#A8B9AE] space-y-3">
            <Music className="w-8 h-8 mx-auto opacity-50 text-[#198754] dark:text-[#6FCF97]" />
            <p>No songs in this setlist yet.</p>
            {onAddSongClick && (
              <Button size="sm" variant="outline" onClick={onAddSongClick}>
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add Songs
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* Now Playing Card */}
            {currentItem && (
              <div className="p-3.5 rounded-xl bg-[#E8F1E9] dark:bg-[#24372C] border border-[#198754]/30 dark:border-[#6FCF97]/30 shadow-2xs space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider text-[#146C43] dark:text-[#6FCF97]">
                    <Sparkles className="w-3 h-3" />
                    Now Playing ({currentSongIndex + 1} of {totalSongs})
                  </span>
                  {currentItem.song.songKey && (
                    <span className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded bg-white dark:bg-[#17251E] text-[#146C43] dark:text-[#6FCF97] border border-[#198754]/20">
                      Key: {currentItem.song.songKey}
                    </span>
                  )}
                </div>

                <div>
                  <h4 className="font-bold text-base text-[#1C2924] dark:text-[#F0F5F0] leading-snug truncate">
                    {currentItem.song.title}
                  </h4>
                  <p className="text-xs text-[#647067] dark:text-[#A8B9AE] truncate">
                    {currentItem.song.artist || 'Unknown Artist'}
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-1 text-[11px] text-[#647067] dark:text-[#A8B9AE]">
                  {currentItem.song.capo > 0 && (
                    <span className="inline-flex items-center gap-0.5">
                      <Hash className="w-3 h-3" /> Capo {currentItem.song.capo}
                    </span>
                  )}
                  {currentItem.song.tempo && (
                    <span className="inline-flex items-center gap-0.5">
                      <Gauge className="w-3 h-3" /> {currentItem.song.tempo} BPM
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => onStartPerformance(currentSongIndex)}
                    className="ml-auto inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#198754] text-white hover:bg-[#146C43] transition-colors shadow-2xs"
                  >
                    <Play className="w-3 h-3" />
                    Perform
                  </button>
                </div>
              </div>
            )}

            {/* Up Next Card */}
            {nextItem ? (
              <div className="p-3 rounded-xl bg-white dark:bg-[#17251E] border border-[#E4E9E3] dark:border-[#2A4033] shadow-2xs space-y-1.5">
                <div className="flex items-center justify-between text-[10px] uppercase font-bold tracking-wider text-[#647067] dark:text-[#A8B9AE]">
                  <span>Up Next ({currentSongIndex + 2} of {totalSongs})</span>
                  {nextItem.song.songKey && <span>Key: {nextItem.song.songKey}</span>}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <h5 className="font-semibold text-xs text-[#1C2924] dark:text-[#F0F5F0] truncate">
                      {nextItem.song.title}
                    </h5>
                    <p className="text-[11px] text-[#647067] dark:text-[#A8B9AE] truncate">
                      {nextItem.song.artist || 'Unknown Artist'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onNextSong}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold text-[#146C43] dark:text-[#6FCF97] bg-[#E8F1E9] dark:bg-[#24372C] hover:bg-[#198754] hover:text-white transition-colors shrink-0"
                    title="Select next song"
                  >
                    Select Next &rarr;
                  </button>
                </div>
              </div>
            ) : totalSongs > 0 && currentSongIndex === totalSongs - 1 ? (
              <div className="p-2.5 text-center rounded-xl bg-[#FAFAF6] dark:bg-[#101A16] border border-[#E4E9E3] dark:border-[#2A4033] text-xs text-[#647067] dark:text-[#A8B9AE]">
                &bull; Reached final song of setlist &bull;
              </div>
            ) : null}

            {/* Full Sequence List */}
            <div className="space-y-1.5 pt-2">
              <div className="flex items-center justify-between text-xs font-semibold text-[#647067] dark:text-[#A8B9AE] pb-1">
                <span>Song Queue Sequence</span>
                {onAddSongClick && (
                  <button
                    type="button"
                    onClick={onAddSongClick}
                    className="text-[11px] font-medium text-[#198754] dark:text-[#6FCF97] hover:underline"
                  >
                    + Add Song
                  </button>
                )}
              </div>

              <div className="space-y-1">
                {setlist.songs.map((item, idx) => {
                  const isCurrent = idx === currentSongIndex;
                  const isPast = idx < currentSongIndex;

                  return (
                    <div
                      key={item.song.id}
                      onClick={() => onSelectSongIndex(idx)}
                      className={cn(
                        'group flex items-center justify-between gap-2 p-2 rounded-xl border text-xs cursor-pointer transition-all select-none',
                        isCurrent
                          ? 'bg-[#E8F1E9] dark:bg-[#24372C] border-[#198754] dark:border-[#6FCF97] font-semibold text-[#146C43] dark:text-[#F0F5F0] shadow-2xs'
                          : isPast
                          ? 'bg-transparent border-[#E4E9E3]/60 dark:border-[#2A4033]/60 text-[#647067] dark:text-[#A8B9AE] opacity-75 hover:opacity-100 hover:bg-[#E8F1E9]/40'
                          : 'bg-white dark:bg-[#17251E] border-[#E4E9E3] dark:border-[#2A4033] text-[#1C2924] dark:text-[#F0F5F0] hover:bg-[#E8F1E9]/50 dark:hover:bg-[#24372C]/40'
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {/* Status / Position indicator */}
                        <span
                          className={cn(
                            'w-5 h-5 rounded-full font-mono text-[10px] font-bold flex items-center justify-center shrink-0',
                            isCurrent
                              ? 'bg-[#198754] text-white'
                              : isPast
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                              : 'bg-[#FAFAF6] dark:bg-[#101A16] text-[#647067] dark:text-[#A8B9AE]'
                          )}
                        >
                          {isPast ? <CheckCircle2 className="w-3.5 h-3.5" /> : idx + 1}
                        </span>

                        <div className="min-w-0">
                          <p className="truncate leading-tight font-medium">
                            {item.song.title}
                          </p>
                          <p className="text-[10px] text-[#647067] dark:text-[#A8B9AE] truncate">
                            {item.song.artist || 'Unknown'} {item.song.songKey ? `(${item.song.songKey})` : ''}
                          </p>
                        </div>
                      </div>

                      {/* Quick Move Up/Down Controls */}
                      {onMoveSong && (
                        <div
                          className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => onMoveSong(idx, 'up')}
                            className="p-1 rounded text-[#647067] dark:text-[#A8B9AE] hover:text-[#198754] disabled:opacity-20"
                            title="Move up"
                            aria-label={`Move ${item.song.title} up`}
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === totalSongs - 1}
                            onClick={() => onMoveSong(idx, 'down')}
                            className="p-1 rounded text-[#647067] dark:text-[#A8B9AE] hover:text-[#198754] disabled:opacity-20"
                            title="Move down"
                            aria-label={`Move ${item.song.title} down`}
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {/* 3. Performance Navigation Footer Controls */}
      {totalSongs > 0 && (
        <div className="p-3 border-t border-[#E4E9E3] dark:border-[#2A4033] bg-[#FAFAF6] dark:bg-[#101A16] space-y-2 shrink-0">
          <div className="flex items-center justify-between gap-2">
            {/* Prev Song */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!hasPrev}
              onClick={onPrevSong}
              className="flex-1 py-1.5 min-h-[38px]"
              title="Previous song in setlist"
              aria-label="Previous song"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              <span>Prev</span>
            </Button>

            {/* Position */}
            <span className="text-xs font-mono font-bold text-[#146C43] dark:text-[#6FCF97] px-2 text-center whitespace-nowrap">
              {currentSongIndex + 1} / {totalSongs}
            </span>

            {/* Next Song */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!hasNext}
              onClick={onNextSong}
              className="flex-1 py-1.5 min-h-[38px]"
              title="Next song in setlist"
              aria-label="Next song"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>

          {/* Full Screen Performance Button */}
          <Button
            type="button"
            variant="primary"
            onClick={() => onStartPerformance(currentSongIndex)}
            className="w-full shadow-xs min-h-[40px]"
            title="Launch live full-screen performance mode"
          >
            <Play className="w-4 h-4 mr-1.5" />
            <span>Start Performance</span>
          </Button>
        </div>
      )}
    </div>
  );

  // If rendered as a mobile drawer / modal
  if (isMobileDrawer) {
    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 z-50 md:hidden flex justify-end">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/60 dark:bg-black/75 backdrop-blur-xs transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />

        {/* Slide-out drawer */}
        <div
          className="relative w-80 max-w-[85vw] h-full z-10 transition-transform duration-200"
          role="dialog"
          aria-modal="true"
          aria-label="Setlist queue drawer"
        >
          {panelContent}
        </div>
      </div>
    );
  }

  // Desktop / Tablet docked panel
  return <div className={cn('h-full', className)}>{panelContent}</div>;
};
