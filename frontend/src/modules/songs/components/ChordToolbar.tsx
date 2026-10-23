import React, { useState, useMemo, useEffect } from 'react';
import { History, Sparkles, HelpCircle, Music, KeyRound } from 'lucide-react';
import { cn } from '../../../lib/utils.js';
import { getChordFamily, type ChordFamilyDegree } from '../../../lib/chords/family.js';

export interface ChordToolbarProps {
  onInsertChord: (chord: string) => void;
  onUndoLastChord?: () => void;
  canUndo?: boolean;
  className?: string;
  songKey?: string | null;
  onSelectKey?: (key: string) => void;
}

type ChordCategory = 'family' | 'major' | 'minor' | 'seventh' | 'susAdd' | 'slash' | 'recent';

const CHORD_CATEGORIES: { id: ChordCategory; label: string; chords: string[] }[] = [
  {
    id: 'major',
    label: 'Major',
    chords: ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'C#', 'Eb', 'F#', 'Ab', 'Bb'],
  },
  {
    id: 'minor',
    label: 'Minor',
    chords: ['Cm', 'Dm', 'Em', 'Fm', 'Gm', 'Am', 'Bm', 'C#m', 'F#m', 'Bbm'],
  },
  {
    id: 'seventh',
    label: '7th',
    chords: ['C7', 'D7', 'E7', 'G7', 'A7', 'B7', 'Cmaj7', 'Fmaj7', 'Gmaj7', 'Am7', 'Dm7', 'Em7'],
  },
  {
    id: 'susAdd',
    label: 'Sus / Add',
    chords: ['Csus2', 'Csus4', 'Dsus2', 'Dsus4', 'Gsus4', 'Asus4', 'Cadd9', 'Dadd9', 'Gadd9', 'Aadd9'],
  },
  {
    id: 'slash',
    label: 'Slash',
    chords: ['D/F#', 'G/B', 'C/E', 'Am/C', 'F/A', 'Em/G', 'A/C#', 'E/G#'],
  },
];

const POPULAR_KEYS = ['C', 'G', 'D', 'A', 'E', 'F', 'Bb', 'Am', 'Em', 'Dm'];

export const ChordToolbar: React.FC<ChordToolbarProps> = ({
  onInsertChord,
  onUndoLastChord,
  canUndo = false,
  className,
  songKey,
  onSelectKey,
}) => {
  // If a songKey is provided at mount, default to 'family' tab
  const [activeCategory, setActiveCategory] = useState<ChordCategory>(() =>
    songKey && songKey.trim() ? 'family' : 'family'
  );

  const [recentChords, setRecentChords] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('chord_viewer_recent_chords');
      return stored ? JSON.parse(stored) : ['C', 'G', 'Am', 'F', 'D', 'Em'];
    } catch {
      return ['C', 'G', 'Am', 'F', 'D', 'Em'];
    }
  });

  const [showGuide, setShowGuide] = useState(false);

  // Compute family chords dynamically from the songKey prop entered at the top
  const familyResult = useMemo(() => getChordFamily(songKey), [songKey]);
  const hasKeySpecified = Boolean(songKey && songKey.trim());

  // Auto-switch to 'family' tab when a user enters a key for the first time
  useEffect(() => {
    if (songKey && songKey.trim()) {
      setActiveCategory('family');
    }
  }, [songKey]);

  const handleChordClick = (chord: string) => {
    onInsertChord(chord);

    // Update recents
    setRecentChords((prev) => {
      const filtered = prev.filter((c) => c !== chord);
      const updated = [chord, ...filtered].slice(0, 10);
      try {
        localStorage.setItem('chord_viewer_recent_chords', JSON.stringify(updated));
      } catch {
        // Ignore storage errors
      }
      return updated;
    });
  };

  const currentChords =
    activeCategory === 'recent'
      ? recentChords
      : activeCategory === 'family'
      ? familyResult.chords
      : CHORD_CATEGORIES.find((cat) => cat.id === activeCategory)?.chords || [];

  return (
    <div
      className={cn(
        'rounded-xl border border-[#E4E9E3] dark:border-[#2A4033] bg-white dark:bg-[#17251E] p-3 shadow-xs space-y-2.5 select-none w-full max-w-full',
        className
      )}
    >
      {/* Category Tabs & Quick Action Bar */}
      <div className="flex items-center justify-between gap-2 border-b border-[#E4E9E3] dark:border-[#2A4033] pb-2">
        {/* Horizontal Category Switcher */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 min-w-0">
          {/* Family Codes Tab (Directly driven by key in the top) */}
          <button
            type="button"
            onClick={() => setActiveCategory('family')}
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all shrink-0',
              activeCategory === 'family'
                ? 'bg-[#198754] text-white shadow-xs'
                : 'text-[#146C43] dark:text-[#6FCF97] bg-[#E8F1E9] dark:bg-[#24372C] hover:bg-[#198754] hover:text-white dark:hover:bg-[#6FCF97] dark:hover:text-[#101A16]'
            )}
            title={`Family Codes (chords for key: ${hasKeySpecified ? familyResult.displayName : 'C Major'})`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Family Codes</span>
            {hasKeySpecified && (
              <span
                className={cn(
                  'text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold',
                  activeCategory === 'family'
                    ? 'bg-white/20 text-white'
                    : 'bg-[#198754]/20 text-[#146C43] dark:text-[#6FCF97]'
                )}
              >
                {familyResult.key}
              </span>
            )}
          </button>

          {/* Major Tab */}
          <button
            type="button"
            onClick={() => setActiveCategory('major')}
            className={cn(
              'px-2.5 py-1 rounded-lg text-xs font-medium transition-all shrink-0',
              activeCategory === 'major'
                ? 'bg-[#198754] text-white shadow-xs'
                : 'text-[#647067] dark:text-[#A8B9AE] hover:bg-[#E8F1E9] dark:hover:bg-[#24372C] hover:text-[#146C43] dark:hover:text-[#F0F5F0]'
            )}
          >
            Major
          </button>

          {/* Minor Tab */}
          <button
            type="button"
            onClick={() => setActiveCategory('minor')}
            className={cn(
              'px-2.5 py-1 rounded-lg text-xs font-medium transition-all shrink-0',
              activeCategory === 'minor'
                ? 'bg-[#198754] text-white shadow-xs'
                : 'text-[#647067] dark:text-[#A8B9AE] hover:bg-[#E8F1E9] dark:hover:bg-[#24372C] hover:text-[#146C43] dark:hover:text-[#F0F5F0]'
            )}
          >
            Minor
          </button>

          {/* 7th, Sus, Slash Tabs */}
          {CHORD_CATEGORIES.slice(2).map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                'px-2.5 py-1 rounded-lg text-xs font-medium transition-all shrink-0',
                activeCategory === cat.id
                  ? 'bg-[#198754] text-white shadow-xs'
                  : 'text-[#647067] dark:text-[#A8B9AE] hover:bg-[#E8F1E9] dark:hover:bg-[#24372C] hover:text-[#146C43] dark:hover:text-[#F0F5F0]'
              )}
            >
              {cat.label}
            </button>
          ))}

          {/* Recent Tab */}
          <button
            type="button"
            onClick={() => setActiveCategory('recent')}
            className={cn(
              'inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all shrink-0',
              activeCategory === 'recent'
                ? 'bg-[#198754] text-white shadow-xs'
                : 'text-[#647067] dark:text-[#A8B9AE] hover:bg-[#E8F1E9] dark:hover:bg-[#24372C] hover:text-[#146C43] dark:hover:text-[#F0F5F0]'
            )}
            title="Recently used chords"
          >
            <History className="w-3.5 h-3.5" />
            <span>Recent</span>
          </button>
        </div>

        {/* Right Actions: Undo & Notation Guide Toggle */}
        <div className="flex items-center gap-1.5 shrink-0">
          {onUndoLastChord && (
            <button
              type="button"
              disabled={!canUndo}
              onClick={onUndoLastChord}
              className="px-2 py-1 text-xs rounded-md text-[#647067] dark:text-[#A8B9AE] hover:bg-[#E8F1E9] dark:hover:bg-[#24372C] hover:text-[#198754] dark:hover:text-[#6FCF97] disabled:opacity-40 disabled:pointer-events-none transition-colors"
              title="Undo last chord insertion"
            >
              Undo
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowGuide(!showGuide)}
            className="p-1 rounded-md text-[#647067] dark:text-[#A8B9AE] hover:text-[#198754] dark:hover:text-[#6FCF97] hover:bg-[#E8F1E9] dark:hover:bg-[#24372C] transition-colors"
            title="How inline chord notation works"
            aria-label="How inline chord notation works"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Notation Quick Guide Callout (Collapsible) */}
      {showGuide && (
        <div className="p-2.5 rounded-lg bg-[#E8F1E9] dark:bg-[#24372C]/60 border border-[#198754]/30 dark:border-[#6FCF97]/30 text-xs text-[#1C2924] dark:text-[#F0F5F0] space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-[#146C43] dark:text-[#6FCF97]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Inline Notation Rule</span>
          </div>
          <p className="leading-relaxed text-[#647067] dark:text-[#A8B9AE]">
            Place cursor in your lyrics, then click a chord button to insert it right before the lyric syllable:
          </p>
          <code className="block p-1.5 bg-white dark:bg-[#17251E] rounded font-mono text-[11px] text-[#146C43] dark:text-[#6FCF97] border border-[#E4E9E3] dark:border-[#2A4033]">
            [C]Amazing [G]grace, how [Am]sweet the [F]sound
          </code>
        </div>
      )}

      {/* Family Codes Banner (When active category is 'family') */}
      {activeCategory === 'family' && (
        <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-lg bg-[#FAFAF6] dark:bg-[#101A16] border border-[#E4E9E3] dark:border-[#2A4033] text-xs">
          <div className="flex items-center gap-1.5 text-[#146C43] dark:text-[#6FCF97] font-semibold">
            <Music className="w-3.5 h-3.5 shrink-0" />
            {hasKeySpecified ? (
              <span>
                Key of <strong>{familyResult.displayName}</strong> ({familyResult.key}) &bull; Diatonic Family Chords:
              </span>
            ) : (
              <span className="text-[#647067] dark:text-[#A8B9AE] font-normal">
                Type an <strong>Original Key</strong> in Song Details above (e.g., G, C, Am, D) to load its chords:
              </span>
            )}
          </div>

          {/* Quick key picker chips if user hasn't typed a key */}
          {!hasKeySpecified && onSelectKey && (
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-[11px] text-[#647067] dark:text-[#A8B9AE]">Quick pick:</span>
              {POPULAR_KEYS.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => onSelectKey(k)}
                  className="px-1.5 py-0.5 rounded font-mono text-[11px] font-semibold bg-[#E8F1E9] dark:bg-[#24372C] text-[#146C43] dark:text-[#6FCF97] hover:bg-[#198754] hover:text-white dark:hover:bg-[#6FCF97] dark:hover:text-[#101A16] transition-colors"
                  title={`Set song key to ${k}`}
                >
                  {k}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Chord Buttons Grid */}
      {activeCategory === 'family' ? (
        /* Family Codes with Roman numeral badges */
        <div className="flex flex-wrap items-center gap-1.5 min-h-[46px]">
          {familyResult.degrees.map((deg: ChordFamilyDegree) => (
            <button
              key={`${deg.roman}-${deg.chord}`}
              type="button"
              onClick={() => handleChordClick(deg.chord)}
              className={cn(
                'group flex flex-col items-center justify-center min-w-[48px] px-2.5 py-1.5 rounded-lg transition-all select-none',
                'bg-[#FAFAF6] dark:bg-[#101A16] text-[#1C2924] dark:text-[#F0F5F0]',
                'border border-[#E4E9E3] dark:border-[#2A4033]',
                'hover:border-[#198754] dark:hover:border-[#6FCF97] hover:bg-[#E8F1E9] dark:hover:bg-[#24372C] hover:text-[#146C43] dark:hover:text-[#6FCF97]',
                'active:scale-95 focus:outline-none focus:ring-1 focus:ring-[#198754] dark:focus:ring-[#6FCF97]'
              )}
              title={`Insert [${deg.chord}] (${deg.roman} • ${deg.name})`}
            >
              <span className="text-[9px] font-sans font-bold tracking-wider text-[#647067] dark:text-[#A8B9AE] group-hover:text-[#146C43] dark:group-hover:text-[#6FCF97] uppercase leading-none mb-0.5">
                {deg.roman}
              </span>
              <span className="font-mono text-xs font-bold tracking-tight">
                {deg.chord}
              </span>
            </button>
          ))}
        </div>
      ) : (
        /* Standard chord category grid */
        <div className="flex flex-wrap items-center gap-1.5 min-h-[38px]">
          {currentChords.length === 0 ? (
            <span className="text-xs text-[#647067] dark:text-[#A8B9AE] italic py-1">
              No recently used chords yet. Insert any chord to add it here.
            </span>
          ) : (
            currentChords.map((chord) => (
              <button
                key={chord}
                type="button"
                onClick={() => handleChordClick(chord)}
                className={cn(
                  'min-w-[40px] px-2.5 py-1.5 rounded-lg font-mono text-xs font-semibold tracking-wide transition-all select-none',
                  'bg-[#FAFAF6] dark:bg-[#101A16] text-[#1C2924] dark:text-[#F0F5F0]',
                  'border border-[#E4E9E3] dark:border-[#2A4033]',
                  'hover:border-[#198754] dark:hover:border-[#6FCF97] hover:bg-[#E8F1E9] dark:hover:bg-[#24372C] hover:text-[#146C43] dark:hover:text-[#6FCF97]',
                  'active:scale-95 focus:outline-none focus:ring-1 focus:ring-[#198754] dark:focus:ring-[#6FCF97]'
                )}
                title={`Insert [${chord}] at cursor`}
              >
                {chord}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};
