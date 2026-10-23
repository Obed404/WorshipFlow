import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  Play,
  Pause,
  Minus,
  Plus,
  RotateCcw,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  ListMusic,
  CheckCircle2,
  Clock,
  Sparkles,
  Search,
  ArrowRightCircle,
  RectangleVertical,
  Columns2,
  Columns3,
} from 'lucide-react';
import { ChordSheet } from './ChordSheet.js';
import { transposeChord } from '../../../lib/chords/index.js';
import { cn } from '../../../lib/utils.js';
import { useSongViewSettings } from '../../../lib/hooks/useSongViewSettings.js';
import type { Song } from '../types/song.types.js';
import type { SetlistSongItem } from '../../setlists/api/setlists.api.js';

export interface PerformanceModeModalProps {
  song: Song;
  initialOffset?: number;
  isOpen: boolean;
  onClose: () => void;
  onTransposeChange?: (offset: number) => void;

  // Setlist Integration
  setlistName?: string;
  setlistSongs?: SetlistSongItem[];
  currentSongIndex?: number;
  onSelectSongIndex?: (index: number) => void;

  // Fallback / legacy navigation hooks
  onNextSong?: () => void;
  onPrevSong?: () => void;
  hasNextSong?: boolean;
  hasPrevSong?: boolean;
}

export const PerformanceModeModal: React.FC<PerformanceModeModalProps> = ({
  song,
  initialOffset = 0,
  isOpen,
  onClose,
  onTransposeChange,
  setlistName,
  setlistSongs,
  currentSongIndex,
  onSelectSongIndex,
  onNextSong,
  onPrevSong,
  hasNextSong = false,
  hasPrevSong = false,
}) => {
  // 1. Reading & Multi-Column View Settings Hook
  const {
    fontSize,
    preferredColumns,
    activeColumns,
    isFallbackActive,
    viewportWidth,
    increaseFontSize,
    decreaseFontSize,
    resetFontSize,
    setPreferredColumns,
  } = useSongViewSettings();

  // 2. Transpose, Auto-scroll & Layout States
  const [offset, setOffsetState] = useState(initialOffset);

  const changeOffset = (newOffset: number | ((prev: number) => number)) => {
    setOffsetState((prev) => {
      const next = typeof newOffset === 'function' ? newOffset(prev) : newOffset;
      onTransposeChange?.(next);
      return next;
    });
  };
  const [lineSpacing, setLineSpacing] = useState<'normal' | 'relaxed' | 'loose'>('relaxed');
  const [isAutoScrolling, setIsAutoScrolling] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState<number>(2); // 1 to 5
  const [isFullscreen, setIsFullscreen] = useState(false);

  // 3. Full-Screen Song List & Scheduled Next State
  const [isSongListOpen, setIsSongListOpen] = useState(false);
  const [scheduledNextIndex, setScheduledNextIndex] = useState<number | null>(null);
  const [searchFilter, setSearchFilter] = useState('');

  // 4. Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const activeSongRef = useRef<HTMLDivElement>(null);
  const wakeLockRef = useRef<any>(null);

  const totalSongs = setlistSongs ? setlistSongs.length : 0;
  const hasSetlist = totalSongs > 0;

  // Sync initial offset and reset scroll position when song changes
  useEffect(() => {
    setOffsetState(initialOffset);
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = 0;
    }
    setIsAutoScrolling(false);
  }, [initialOffset, song.id]);

  // Sync fullscreen state with browser events (e.g. Escape or F11)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Screen Wake Lock API to prevent screen from sleeping during performance
  useEffect(() => {
    async function requestWakeLock() {
      try {
        if ('wakeLock' in navigator && isOpen) {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        }
      } catch {
        // WakeLock may fail if battery is low or not supported
      }
    }

    if (isOpen) {
      requestWakeLock();
    }

    return () => {
      if (wakeLockRef.current) {
        try {
          wakeLockRef.current.release();
        } catch {}
        wakeLockRef.current = null;
      }
    };
  }, [isOpen]);

  // Smooth Auto-scroll loop
  useEffect(() => {
    if (!isAutoScrolling || !isOpen) return;

    let animationFrameId: number;
    let lastTime = performance.now();

    const scrollLoop = (currentTime: number) => {
      const delta = currentTime - lastTime;
      lastTime = currentTime;

      if (scrollAreaRef.current) {
        const speedMap = [0, 15, 25, 40, 60, 85];
        const pxPerSec = speedMap[scrollSpeed] || 25;
        const scrollStep = (pxPerSec * delta) / 1000;

        scrollAreaRef.current.scrollTop += scrollStep;

        // Stop when reached bottom
        const { scrollTop, scrollHeight, clientHeight } = scrollAreaRef.current;
        if (scrollTop + clientHeight >= scrollHeight - 2) {
          setIsAutoScrolling(false);
          return;
        }
      }

      animationFrameId = requestAnimationFrame(scrollLoop);
    };

    animationFrameId = requestAnimationFrame(scrollLoop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isAutoScrolling, scrollSpeed, isOpen]);

  // Compute effective next song:
  // Default is the sequential next song; custom scheduled song takes priority if valid
  const defaultNextIndex = useMemo(() => {
    if (hasSetlist && currentSongIndex !== undefined && currentSongIndex < totalSongs - 1) {
      return currentSongIndex + 1;
    }
    return null;
  }, [hasSetlist, currentSongIndex, totalSongs]);

  const effectiveNextIndex = useMemo(() => {
    if (
      scheduledNextIndex !== null &&
      scheduledNextIndex !== currentSongIndex &&
      scheduledNextIndex >= 0 &&
      scheduledNextIndex < totalSongs
    ) {
      return scheduledNextIndex;
    }
    return defaultNextIndex;
  }, [scheduledNextIndex, currentSongIndex, totalSongs, defaultNextIndex]);

  const isCustomScheduled =
    scheduledNextIndex !== null &&
    scheduledNextIndex !== defaultNextIndex &&
    scheduledNextIndex !== currentSongIndex;

  const effectiveNextItem =
    hasSetlist && effectiveNextIndex !== null ? setlistSongs![effectiveNextIndex] : null;

  // Filtered setlist songs for search
  const filteredSetlistSongs = useMemo(() => {
    if (!setlistSongs) return [];
    if (!searchFilter.trim()) return setlistSongs;
    const q = searchFilter.toLowerCase();
    return setlistSongs.filter(
      (item) =>
        item.song.title.toLowerCase().includes(q) ||
        (item.song.artist && item.song.artist.toLowerCase().includes(q)) ||
        (item.song.songKey && item.song.songKey.toLowerCase().includes(q))
    );
  }, [setlistSongs, searchFilter]);

  // Clear custom scheduled next when the song becomes the current song
  useEffect(() => {
    if (currentSongIndex !== undefined && scheduledNextIndex === currentSongIndex) {
      setScheduledNextIndex(null);
    }
  }, [currentSongIndex, scheduledNextIndex]);

  // Auto-scroll current song into view when opening the song list
  useEffect(() => {
    if (isSongListOpen && activeSongRef.current) {
      activeSongRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [isSongListOpen, currentSongIndex]);

  // Navigation handlers
  const playSong = (index: number) => {
    if (onSelectSongIndex) {
      onSelectSongIndex(index);
      if (scheduledNextIndex === index) {
        setScheduledNextIndex(null);
      }
    }
    setIsSongListOpen(false);
  };

  const playNext = () => {
    if (effectiveNextIndex !== null && onSelectSongIndex) {
      onSelectSongIndex(effectiveNextIndex);
      setScheduledNextIndex(null);
    } else if (onNextSong) {
      onNextSong();
      setScheduledNextIndex(null);
    }
  };

  const playPrev = () => {
    if (currentSongIndex !== undefined && currentSongIndex > 0 && onSelectSongIndex) {
      onSelectSongIndex(currentSongIndex - 1);
    } else if (onPrevSong) {
      onPrevSong();
    }
  };

  const toggleScheduleNext = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (scheduledNextIndex === index) {
      setScheduledNextIndex(null);
    } else if (index !== currentSongIndex) {
      setScheduledNextIndex(index);
    }
  };

  const canGoPrev = hasSetlist
    ? currentSongIndex !== undefined && currentSongIndex > 0
    : Boolean(hasPrevSong);

  const canGoNext = hasSetlist
    ? effectiveNextIndex !== null
    : Boolean(hasNextSong);

  // Keyboard shortcut listener
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        // If song list is open, close it first without exiting performance mode
        if (isSongListOpen) {
          setIsSongListOpen(false);
        } else {
          onClose();
        }
      } else if (e.key === 'l' || e.key === 'L') {
        e.preventDefault();
        if (hasSetlist) {
          setIsSongListOpen((prev) => !prev);
        }
      } else if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        setPreferredColumns(preferredColumns === 1 ? 2 : preferredColumns === 2 ? 3 : 1);
      } else if (e.code === 'Space') {
        e.preventDefault();
        setIsAutoScrolling((prev) => !prev);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        changeOffset((prev) => prev + 1);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        changeOffset((prev) => prev - 1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (canGoPrev) playPrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (canGoNext) playNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isOpen,
    isSongListOpen,
    hasSetlist,
    canGoPrev,
    canGoNext,
    effectiveNextIndex,
    currentSongIndex,
    preferredColumns,
    setPreferredColumns,
    onClose,
  ]);

  if (!isOpen) return null;

  const currentKey = song.songKey ? transposeChord(song.songKey, offset) : null;

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement && containerRef.current) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else if (document.fullscreenElement) {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch {
      // Fullscreen not permitted or supported
    }
  };

  const lineSpacingClass =
    lineSpacing === 'normal'
      ? 'leading-normal'
      : lineSpacing === 'relaxed'
      ? 'leading-relaxed'
      : 'leading-loose';

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-[#FAFAF6] dark:bg-[#101A16] text-[#1C2924] dark:text-[#F0F5F0] flex flex-col overflow-hidden select-none"
      role="dialog"
      aria-modal="true"
      aria-label="Performance Mode"
    >
      {/* ============================================================== */}
      {/* 1. Top Primary Floating Control Bar                             */}
      {/* ============================================================== */}
      <header className="h-16 px-3 sm:px-6 bg-white/95 dark:bg-[#17251E]/95 backdrop-blur-md border-b border-[#E4E9E3] dark:border-[#2A4033] flex items-center justify-between gap-2 sm:gap-3 shrink-0 shadow-xs z-20">
        {/* Left: Song Info & Setlist Position */}
        <div className="flex items-center gap-2 sm:gap-3 overflow-hidden min-w-0">
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-[#1C2924] dark:text-[#F0F5F0] truncate">
                {song.title}
              </h2>
              {hasSetlist && currentSongIndex !== undefined && (
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-[#E8F1E9] dark:bg-[#24372C] text-[#146C43] dark:text-[#6FCF97] border border-[#198754]/20 shrink-0">
                  {currentSongIndex + 1} of {totalSongs}
                </span>
              )}
            </div>
            <p className="text-xs text-[#647067] dark:text-[#A8B9AE] truncate">
              {song.artist || 'Unknown Artist'} {song.tempo ? `• ${song.tempo} BPM` : ''}
              {song.capo > 0 ? ` • Capo ${song.capo}` : ''}
            </p>
          </div>
        </div>

        {/* Center: Live Music Controls (Transpose, Font Size, Columns, Scroll) */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Transpose Controls */}
          <div className="flex items-center gap-0.5 sm:gap-1 bg-[#E8F1E9] dark:bg-[#24372C] p-1 rounded-lg">
            <span className="text-xs font-mono font-bold px-1.5 min-w-[46px] text-center text-[#1C2924] dark:text-[#F0F5F0]">
              {currentKey || `0`}
            </span>
            <button
              type="button"
              onClick={() => changeOffset((o) => o - 1)}
              className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-white dark:hover:bg-[#17251E] text-xs font-bold text-[#1C2924] dark:text-[#F0F5F0] transition-colors"
              title="Down 1 semitone (↓)"
              aria-label="Transpose down"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => changeOffset((o) => o + 1)}
              className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-white dark:hover:bg-[#17251E] text-xs font-bold text-[#1C2924] dark:text-[#F0F5F0] transition-colors"
              title="Up 1 semitone (↑)"
              aria-label="Transpose up"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            {offset !== 0 && (
              <button
                type="button"
                onClick={() => changeOffset(0)}
                className="w-6 h-6 flex items-center justify-center text-[#647067] hover:text-[#1C2924] dark:hover:text-[#F0F5F0]"
                title="Reset key"
                aria-label="Reset key"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Font Size & Line Spacing */}
          <div className="hidden md:flex items-center gap-1 bg-[#E8F1E9] dark:bg-[#24372C] p-1 rounded-lg">
            <button
              type="button"
              onClick={decreaseFontSize}
              className="px-2 py-1 text-xs font-bold rounded hover:bg-white dark:hover:bg-[#17251E] text-[#1C2924] dark:text-[#F0F5F0]"
              title="Smaller text (A-)"
              aria-label="Decrease font size"
            >
              A-
            </button>
            <span className="font-mono text-[11px] font-bold text-[#146C43] dark:text-[#6FCF97] px-1 select-none">
              {fontSize}px
            </span>
            <button
              type="button"
              onClick={increaseFontSize}
              className="px-2 py-1 text-xs font-bold rounded hover:bg-white dark:hover:bg-[#17251E] text-[#1C2924] dark:text-[#F0F5F0]"
              title="Larger text (A+)"
              aria-label="Increase font size"
            >
              A+
            </button>
            {fontSize !== 18 && (
              <button
                type="button"
                onClick={resetFontSize}
                className="w-6 h-6 flex items-center justify-center text-[#647067] hover:text-[#1C2924] dark:hover:text-[#F0F5F0]"
                title="Reset font size to 18px"
                aria-label="Reset font size"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            )}
            <div className="w-px h-3.5 bg-[#E4E9E3] dark:bg-[#2A4033] mx-0.5" />
            <button
              type="button"
              onClick={() =>
                setLineSpacing((prev) =>
                  prev === 'normal' ? 'relaxed' : prev === 'relaxed' ? 'loose' : 'normal'
                )
              }
              className="px-2 py-1 text-[11px] font-semibold rounded hover:bg-white dark:hover:bg-[#17251E] text-[#647067] dark:text-[#A8B9AE] capitalize"
              title="Cycle line spacing (Normal, Relaxed, Loose)"
            >
              {lineSpacing}
            </button>
          </div>

          {/* Column Layout Selector (1, 2, or 3 Columns) */}
          <div
            className="hidden sm:flex items-center gap-0.5 bg-[#E8F1E9] dark:bg-[#24372C] p-1 rounded-lg"
            role="group"
            aria-label="Song Column Layout"
          >
            {/* 1 Column */}
            <button
              type="button"
              onClick={() => setPreferredColumns(1)}
              className={cn(
                'flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold transition-all',
                preferredColumns === 1
                  ? 'bg-[#198754] text-white shadow-xs'
                  : 'text-[#1C2924] dark:text-[#F0F5F0] hover:bg-white dark:hover:bg-[#17251E]'
              )}
              title="Single Column View"
              aria-label="Single column layout"
              aria-pressed={preferredColumns === 1}
            >
              <RectangleVertical className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">1</span>
            </button>

            {/* 2 Columns */}
            <button
              type="button"
              onClick={() => setPreferredColumns(2)}
              className={cn(
                'flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold transition-all',
                preferredColumns === 2
                  ? 'bg-[#198754] text-white shadow-xs'
                  : 'text-[#1C2924] dark:text-[#F0F5F0] hover:bg-white dark:hover:bg-[#17251E]'
              )}
              title={
                viewportWidth < 640
                  ? 'Two columns (screen width narrow, showing 1 column)'
                  : 'Two Columns View'
              }
              aria-label="Two columns layout"
              aria-pressed={preferredColumns === 2}
            >
              <Columns2 className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">2</span>
            </button>

            {/* 3 Columns */}
            <button
              type="button"
              onClick={() => setPreferredColumns(3)}
              className={cn(
                'flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold transition-all',
                preferredColumns === 3
                  ? 'bg-[#198754] text-white shadow-xs'
                  : 'text-[#1C2924] dark:text-[#F0F5F0] hover:bg-white dark:hover:bg-[#17251E]'
              )}
              title={
                viewportWidth < 1024
                  ? 'Three columns (screen width limited, showing fewer columns)'
                  : 'Three Columns View'
              }
              aria-label="Three columns layout"
              aria-pressed={preferredColumns === 3}
            >
              <Columns3 className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">3</span>
            </button>

            {isFallbackActive && (
              <span
                className="hidden xl:inline text-[10px] font-bold text-[#A16207] dark:text-[#FBBF24] px-1"
                title={`Preferred ${preferredColumns} columns, displaying ${activeColumns} for readability on this screen`}
              >
                ({activeColumns} active)
              </span>
            )}
          </div>

          {/* Auto-scroll Toggle & Speed */}
          <div className="flex items-center gap-1 bg-[#E8F1E9] dark:bg-[#24372C] p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setIsAutoScrolling(!isAutoScrolling)}
              className={cn(
                'flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-md text-xs font-semibold transition-all',
                isAutoScrolling
                  ? 'bg-[#198754] text-white shadow-xs'
                  : 'text-[#1C2924] dark:text-[#F0F5F0] hover:bg-white dark:hover:bg-[#17251E]'
              )}
              title="Toggle Auto-Scroll (Space)"
            >
              {isAutoScrolling ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{isAutoScrolling ? 'Pause' : 'Scroll'}</span>
            </button>

            {isAutoScrolling && (
              <div className="hidden sm:flex items-center gap-0.5 ml-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setScrollSpeed(s)}
                    className={cn(
                      'w-5 h-5 rounded text-[10px] font-bold',
                      scrollSpeed === s
                        ? 'bg-[#198754] text-white'
                        : 'text-[#647067] dark:text-[#A8B9AE] hover:bg-white dark:hover:bg-[#17251E]'
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Next Song Quick Widget & Setlist Toggle */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Desktop Next Song Controller */}
          {hasSetlist && effectiveNextItem && (
            <div
              className={cn(
                'hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs shadow-2xs transition-all',
                isCustomScheduled
                  ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200'
                  : 'bg-[#E8F1E9] dark:bg-[#24372C] border-[#198754]/30 dark:border-[#6FCF97]/30 text-[#146C43] dark:text-[#6FCF97]'
              )}
            >
              <div className="flex items-center gap-1 min-w-0 max-w-[130px] lg:max-w-[180px]">
                <span className="text-[10px] uppercase font-bold tracking-wider shrink-0 opacity-80">
                  {isCustomScheduled ? 'Scheduled:' : 'Next:'}
                </span>
                <span className="font-bold truncate text-[#1C2924] dark:text-[#F0F5F0]">
                  {effectiveNextItem.song.title}
                </span>
                {effectiveNextItem.song.songKey && (
                  <span className="text-[10px] font-mono font-bold shrink-0 opacity-80">
                    ({effectiveNextItem.song.songKey})
                  </span>
                )}
              </div>

              {/* Play Next Button */}
              <button
                type="button"
                onClick={playNext}
                className="ml-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold text-xs bg-[#198754] text-white hover:bg-[#146C43] transition-colors shadow-2xs shrink-0"
                title={`Play Next (→): ${effectiveNextItem.song.title}`}
              >
                <Play className="w-3 h-3 fill-current" />
                <span className="hidden lg:inline">Play Next</span>
              </button>

              {/* Choose Next Action */}
              <button
                type="button"
                onClick={() => setIsSongListOpen(true)}
                className="text-[11px] underline opacity-80 hover:opacity-100 hover:text-[#198754] dark:hover:text-[#6FCF97] ml-0.5 shrink-0"
                title="Choose a different next song from the setlist"
              >
                Choose Next
              </button>
            </div>
          )}

          {/* Setlist Navigation: Prev / Next buttons */}
          {hasSetlist && (
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                disabled={!canGoPrev}
                onClick={playPrev}
                className="p-1.5 rounded-lg text-[#647067] dark:text-[#A8B9AE] hover:bg-[#E8F1E9] dark:hover:bg-[#24372C] hover:text-[#1C2924] dark:hover:text-[#F0F5F0] disabled:opacity-25 transition-colors"
                title="Previous song in setlist (←)"
                aria-label="Previous song"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                disabled={!canGoNext}
                onClick={playNext}
                className="p-1.5 rounded-lg text-[#647067] dark:text-[#A8B9AE] hover:bg-[#E8F1E9] dark:hover:bg-[#24372C] hover:text-[#1C2924] dark:hover:text-[#F0F5F0] disabled:opacity-25 transition-colors"
                title="Play next song in setlist (→)"
                aria-label="Next song"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Toggle Song List Button */}
          {hasSetlist && (
            <button
              type="button"
              onClick={() => setIsSongListOpen((prev) => !prev)}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all',
                isSongListOpen
                  ? 'bg-[#198754] text-white border-[#198754] shadow-xs'
                  : 'bg-white dark:bg-[#17251E] text-[#1C2924] dark:text-[#F0F5F0] border-[#E4E9E3] dark:border-[#2A4033] hover:border-[#198754]'
              )}
              title="Toggle Setlist Song List (L)"
              aria-label="Toggle setlist songs"
              aria-expanded={isSongListOpen}
            >
              <ListMusic className="w-4 h-4" />
              <span className="hidden sm:inline">Songs</span>
              {totalSongs > 0 && (
                <span
                  className={cn(
                    'px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold',
                    isSongListOpen ? 'bg-white text-[#198754]' : 'bg-[#198754] text-white'
                  )}
                >
                  {currentSongIndex !== undefined ? `${currentSongIndex + 1}/${totalSongs}` : totalSongs}
                </span>
              )}
            </button>
          )}

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="hidden sm:flex p-2 rounded-lg text-[#647067] dark:text-[#A8B9AE] hover:bg-[#E8F1E9] dark:hover:bg-[#24372C] transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            aria-label="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Exit Performance Mode */}
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center p-2 rounded-lg bg-[#E8F1E9] dark:bg-[#24372C] text-[#1C2924] dark:text-[#F0F5F0] hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400 transition-colors"
            title="Exit Performance Mode (Esc)"
            aria-label="Exit Performance Mode"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* ============================================================== */}
      {/* 2. Mobile Responsive Sub-Bar                                    */}
      {/* ============================================================== */}
      <div className="md:hidden flex items-center justify-between gap-2 px-3 py-1.5 bg-[#FAFAF6] dark:bg-[#101A16] border-b border-[#E4E9E3] dark:border-[#2A4033] text-xs shrink-0 z-10">
        {hasSetlist ? (
          <div className="flex items-center gap-1 min-w-0">
            <button
              type="button"
              disabled={!canGoPrev}
              onClick={playPrev}
              className="p-1 rounded text-[#647067] dark:text-[#A8B9AE] disabled:opacity-30"
              title="Previous song (←)"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="font-mono font-bold text-[11px] text-[#146C43] dark:text-[#6FCF97] whitespace-nowrap">
              {currentSongIndex !== undefined ? `${currentSongIndex + 1}/${totalSongs}` : ''}
            </span>

            <button
              type="button"
              disabled={!canGoNext}
              onClick={playNext}
              className="p-1 rounded text-[#647067] dark:text-[#A8B9AE] disabled:opacity-30"
              title="Next song (→)"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="text-[11px] text-[#647067] dark:text-[#A8B9AE] font-semibold">
            Solo Mode
          </div>
        )}

        {/* Quick Controls Group for Small Screens: Font Size & Column */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Quick Font Size Controls for Small Screens */}
          <div className="flex items-center gap-0.5 bg-[#E8F1E9] dark:bg-[#24372C] p-0.5 rounded-lg shrink-0">
            <button
              type="button"
              onClick={decreaseFontSize}
              className="px-1.5 py-0.5 text-xs font-bold rounded text-[#1C2924] dark:text-[#F0F5F0]"
              title="Smaller text (A-)"
            >
              A-
            </button>
            <span className="text-[10px] font-mono font-bold text-[#146C43] dark:text-[#6FCF97] px-0.5 select-none">
              {fontSize}
            </span>
            <button
              type="button"
              onClick={increaseFontSize}
              className="px-1.5 py-0.5 text-xs font-bold rounded text-[#1C2924] dark:text-[#F0F5F0]"
              title="Larger text (A+)"
            >
              A+
            </button>
          </div>

          {/* Quick Column Cycle Button for Small Screens */}
          <button
            type="button"
            onClick={() =>
              setPreferredColumns(
                preferredColumns === 1 ? 2 : preferredColumns === 2 ? 3 : 1
              )
            }
            className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-[#E8F1E9] dark:bg-[#24372C] text-[#146C43] dark:text-[#6FCF97] shrink-0"
            title={`Cycle column layout (currently ${activeColumns} col)`}
          >
            {activeColumns === 1 ? (
              <RectangleVertical className="w-3.5 h-3.5" />
            ) : activeColumns === 2 ? (
              <Columns2 className="w-3.5 h-3.5" />
            ) : (
              <Columns3 className="w-3.5 h-3.5" />
            )}
            <span>{activeColumns} col</span>
          </button>
        </div>

        {/* Next Song or Final Song Banner on Mobile */}
        {hasSetlist && effectiveNextItem ? (
          <div className="flex items-center gap-1 min-w-0 truncate">
            <span className="text-[10px] text-[#647067] dark:text-[#A8B9AE] truncate">
              {isCustomScheduled ? 'Scheduled:' : 'Next:'} {effectiveNextItem.song.title}
            </span>
            <button
              type="button"
              onClick={playNext}
              className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#198754] text-white shrink-0"
            >
              Play
            </button>
          </div>
        ) : hasSetlist ? (
          <span className="text-[10px] text-[#647067] dark:text-[#A8B9AE]">Final Song</span>
        ) : null}

        {/* Setlist Drawer Button on Mobile */}
        {hasSetlist && (
          <button
            type="button"
            onClick={() => setIsSongListOpen(true)}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-[#E8F1E9] dark:bg-[#24372C] text-[#146C43] dark:text-[#6FCF97] shrink-0"
          >
            <ListMusic className="w-3.5 h-3.5" />
            <span>List</span>
          </button>
        )}
      </div>

      {/* ============================================================== */}
      {/* 3. Main Workspace: Chord Sheet + Collapsible Setlist Panel     */}
      {/* ============================================================== */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Main Full-Screen Chord Sheet Area */}
        <main
          ref={scrollAreaRef}
          className="flex-1 min-w-0 overflow-y-auto px-4 sm:px-8 lg:px-12 py-8 transition-all"
        >
          <div className="w-full max-w-full space-y-4">
            <ChordSheet
              content={song.content}
              transposeOffset={offset}
              originalKey={song.songKey}
              fontSize={fontSize}
              columns={activeColumns}
              className={lineSpacingClass}
            />
          </div>
        </main>

        {/* ============================================================== */}
        {/* 4. Full-Screen Song List Panel / Sidebar                       */}
        {/* ============================================================== */}
        {hasSetlist && isSongListOpen && (
          <>
            {/* Backdrop for mobile & tablet screens */}
            <div
              className="xl:hidden fixed inset-0 bg-black/60 dark:bg-black/75 backdrop-blur-xs z-30 transition-opacity"
              onClick={() => setIsSongListOpen(false)}
              aria-hidden="true"
            />

            {/* Sidebar / Drawer */}
            <aside
              className={cn(
                'h-full bg-white dark:bg-[#17251E] border-l border-[#E4E9E3] dark:border-[#2A4033] shadow-2xl flex flex-col z-40 transition-all duration-200',
                'fixed inset-y-0 right-0 w-80 sm:w-96 xl:static xl:h-auto xl:w-96 shrink-0'
              )}
              role="region"
              aria-label="Setlist Song Queue"
            >
              {/* Sidebar Header */}
              <div className="p-4 border-b border-[#E4E9E3] dark:border-[#2A4033] bg-[#FAFAF6] dark:bg-[#101A16] flex items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-[#198754] text-white flex items-center justify-center shrink-0 shadow-xs">
                    <ListMusic className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm text-[#1C2924] dark:text-[#F0F5F0] truncate">
                      {setlistName || 'Setlist Songs'}
                    </h3>
                    <p className="text-[11px] text-[#647067] dark:text-[#A8B9AE] truncate">
                      {totalSongs} {totalSongs === 1 ? 'song' : 'songs'} &bull;{' '}
                      {currentSongIndex !== undefined ? `Song ${currentSongIndex + 1} playing` : ''}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsSongListOpen(false)}
                  className="p-1.5 rounded-lg text-[#647067] dark:text-[#A8B9AE] hover:text-[#1C2924] dark:hover:text-[#F0F5F0] hover:bg-[#E8F1E9] dark:hover:bg-[#24372C] transition-colors"
                  title="Close song list (Esc)"
                  aria-label="Close song list"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Quick Filter Search Bar */}
              {totalSongs > 5 && (
                <div className="p-2.5 border-b border-[#E4E9E3] dark:border-[#2A4033] bg-[#FAFAF6]/80 dark:bg-[#101A16]/80 shrink-0">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-[#647067] dark:text-[#A8B9AE] absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Filter setlist songs..."
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-[#E4E9E3] dark:border-[#2A4033] bg-white dark:bg-[#17251E] text-[#1C2924] dark:text-[#F0F5F0] placeholder:text-[#647067] dark:placeholder:text-[#A8B9AE] focus:outline-none focus:ring-1 focus:ring-[#198754]"
                    />
                  </div>
                </div>
              )}

              {/* Scrollable Song Queue List */}
              <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
                {filteredSetlistSongs.length === 0 ? (
                  <div className="text-center py-8 text-xs text-[#647067] dark:text-[#A8B9AE]">
                    No matching songs found in this setlist.
                  </div>
                ) : (
                  filteredSetlistSongs.map((item) => {
                    const originalIdx = setlistSongs!.indexOf(item);
                    const isCurrent = originalIdx === currentSongIndex;
                    const isNext = originalIdx === effectiveNextIndex;
                    const isCustom = isNext && isCustomScheduled;
                    const isPast = currentSongIndex !== undefined && originalIdx < currentSongIndex;

                    return (
                      <div
                        key={item.song.id}
                        ref={isCurrent ? activeSongRef : null}
                        onClick={() => playSong(originalIdx)}
                        className={cn(
                          'group flex flex-col gap-1 p-2.5 rounded-xl border text-xs cursor-pointer transition-all select-none',
                          isCurrent
                            ? 'bg-[#E8F1E9] dark:bg-[#24372C] border-[#198754] dark:border-[#6FCF97] shadow-xs'
                            : isCustom
                            ? 'bg-amber-50/70 dark:bg-amber-950/40 border-amber-400 dark:border-amber-600 shadow-2xs'
                            : isNext
                            ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-700'
                            : isPast
                            ? 'bg-white/60 dark:bg-[#17251E]/60 border-[#E4E9E3]/70 dark:border-[#2A4033]/70 opacity-75 hover:opacity-100 hover:bg-[#E8F1E9]/40'
                            : 'bg-white dark:bg-[#17251E] border-[#E4E9E3] dark:border-[#2A4033] hover:bg-[#E8F1E9]/40 dark:hover:bg-[#24372C]/40'
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            {/* Sequence / Status Indicator */}
                            <span
                              className={cn(
                                'w-5 h-5 rounded-full font-mono text-[10px] font-bold flex items-center justify-center shrink-0',
                                isCurrent
                                  ? 'bg-[#198754] text-white shadow-2xs'
                                  : isCustom
                                  ? 'bg-amber-500 text-white'
                                  : isNext
                                  ? 'bg-emerald-600 text-white'
                                  : isPast
                                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                                  : 'bg-[#FAFAF6] dark:bg-[#101A16] text-[#647067] dark:text-[#A8B9AE]'
                              )}
                            >
                              {isPast ? <CheckCircle2 className="w-3.5 h-3.5" /> : originalIdx + 1}
                            </span>

                            <h4
                              className={cn(
                                'font-bold text-xs truncate',
                                isCurrent
                                  ? 'text-[#146C43] dark:text-[#6FCF97]'
                                  : 'text-[#1C2924] dark:text-[#F0F5F0]'
                              )}
                            >
                              {item.song.title}
                            </h4>
                          </div>

                          {/* Status Badge */}
                          {isCurrent ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#198754] text-white shrink-0">
                              <Sparkles className="w-2.5 h-2.5" /> Now
                            </span>
                          ) : isCustom ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500 text-white shrink-0">
                              <Clock className="w-2.5 h-2.5" /> Scheduled
                            </span>
                          ) : isNext ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-600 text-white shrink-0">
                              <ArrowRightCircle className="w-2.5 h-2.5" /> Up Next
                            </span>
                          ) : null}
                        </div>

                        {/* Song Metadata and "Play Next" Scheduler Button */}
                        <div className="flex items-center justify-between gap-2 pl-7 text-[11px] text-[#647067] dark:text-[#A8B9AE]">
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="truncate">{item.song.artist || 'Unknown'}</span>
                            {item.song.songKey && (
                              <span className="font-mono font-semibold text-[#1C2924] dark:text-[#F0F5F0]">
                                &bull; {item.song.songKey}
                              </span>
                            )}
                            {item.song.tempo && (
                              <span className="font-mono">&bull; {item.song.tempo} BPM</span>
                            )}
                          </div>

                          {/* Quick Action: Schedule Next Button */}
                          {!isCurrent && (
                            <button
                              type="button"
                              onClick={(e) => toggleScheduleNext(originalIdx, e)}
                              className={cn(
                                'text-[11px] font-semibold px-2 py-0.5 rounded transition-all shrink-0',
                                isCustom
                                  ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 hover:bg-amber-200'
                                  : 'text-[#146C43] dark:text-[#6FCF97] hover:bg-[#E8F1E9] dark:hover:bg-[#24372C]'
                              )}
                              title={
                                isCustom
                                  ? 'Cancel scheduled next (resume normal order)'
                                  : 'Schedule this song to play next without switching now'
                              }
                            >
                              {isCustom ? 'Cancel Next' : '+ Play Next'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Sidebar Footer */}
              <div className="p-3 border-t border-[#E4E9E3] dark:border-[#2A4033] bg-[#FAFAF6] dark:bg-[#101A16] flex items-center justify-between gap-2 shrink-0">
                {effectiveNextItem ? (
                  <button
                    type="button"
                    onClick={playNext}
                    className="flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold bg-[#198754] text-white hover:bg-[#146C43] transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span className="truncate">Next: {effectiveNextItem.song.title}</span>
                  </button>
                ) : (
                  <div className="text-xs text-[#647067] dark:text-[#A8B9AE] italic">
                    Final song in setlist
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setIsSongListOpen(false)}
                  className="py-1.5 px-3 rounded-lg text-xs font-semibold border border-[#E4E9E3] dark:border-[#2A4033] text-[#1C2924] dark:text-[#F0F5F0] hover:bg-[#E8F1E9] dark:hover:bg-[#24372C] transition-colors shrink-0"
                >
                  Close
                </button>
              </div>
            </aside>
          </>
        )}
      </div>

      {/* ============================================================== */}
      {/* 5. Bottom Floating Shortcut & Status Indicator                 */}
      {/* ============================================================== */}
      <footer className="py-1.5 px-4 bg-white/80 dark:bg-[#17251E]/80 backdrop-blur-xs border-t border-[#E4E9E3] dark:border-[#2A4033] text-center text-[11px] text-[#647067] dark:text-[#A8B9AE] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 overflow-x-auto py-0.5">
          <span>
            <kbd className="px-1 py-0.5 bg-[#E8F1E9] dark:bg-[#24372C] text-[#1C2924] dark:text-[#F0F5F0] rounded font-mono text-[10px]">
              Space
            </kbd>{' '}
            Scroll
          </span>
          <span>&bull;</span>
          <span>
            <kbd className="px-1 py-0.5 bg-[#E8F1E9] dark:bg-[#24372C] text-[#1C2924] dark:text-[#F0F5F0] rounded font-mono text-[10px]">
              ↑/↓
            </kbd>{' '}
            Key
          </span>
          <span>&bull;</span>
          <span>
            <kbd className="px-1 py-0.5 bg-[#E8F1E9] dark:bg-[#24372C] text-[#1C2924] dark:text-[#F0F5F0] rounded font-mono text-[10px]">
              C
            </kbd>{' '}
            Cols ({activeColumns})
          </span>
          {hasSetlist && (
            <>
              <span>&bull;</span>
              <span>
                <kbd className="px-1 py-0.5 bg-[#E8F1E9] dark:bg-[#24372C] text-[#1C2924] dark:text-[#F0F5F0] rounded font-mono text-[10px]">
                  ←/→
                </kbd>{' '}
                Prev/Next
              </span>
              <span>&bull;</span>
              <span>
                <kbd className="px-1 py-0.5 bg-[#E8F1E9] dark:bg-[#24372C] text-[#1C2924] dark:text-[#F0F5F0] rounded font-mono text-[10px]">
                  L
                </kbd>{' '}
                Songs List
              </span>
            </>
          )}
          <span>&bull;</span>
          <span>
            <kbd className="px-1 py-0.5 bg-[#E8F1E9] dark:bg-[#24372C] text-[#1C2924] dark:text-[#F0F5F0] rounded font-mono text-[10px]">
              Esc
            </kbd>{' '}
            {isSongListOpen ? 'Close List' : 'Exit'}
          </span>
        </div>

        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <span className="text-[11px] font-medium text-[#647067] dark:text-[#A8B9AE]">
            Layout:{' '}
            <strong className="text-[#146C43] dark:text-[#6FCF97]">
              {activeColumns} {activeColumns === 1 ? 'column' : 'columns'}
            </strong>
            {isFallbackActive && (
              <span className="text-amber-600 dark:text-amber-400 font-bold ml-1">
                (auto-fit)
              </span>
            )}
          </span>
          <span className="text-gray-300 dark:text-gray-700">&bull;</span>
          {effectiveNextItem && (
            <>
              <span className="text-[11px] font-semibold text-[#146C43] dark:text-[#6FCF97]">
                {isCustomScheduled ? 'Scheduled Next:' : 'Up Next:'} {effectiveNextItem.song.title}{' '}
                {effectiveNextItem.song.songKey ? `(${effectiveNextItem.song.songKey})` : ''}
              </span>
              <span className="text-gray-300 dark:text-gray-700">&bull;</span>
            </>
          )}
          <span>Wake Lock Active</span>
        </div>
      </footer>
    </div>
  );
};
