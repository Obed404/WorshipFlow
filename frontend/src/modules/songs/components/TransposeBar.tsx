import React, { useEffect } from 'react';
import {
  Minus,
  Plus,
  RotateCcw,
  Columns2,
  Columns3,
  RectangleVertical,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button.js';
import { transposeChord } from '../../../lib/chords/index.js';
import {
  MIN_FONT_SIZE,
  MAX_FONT_SIZE,
  DEFAULT_FONT_SIZE,
  type ColumnOption,
} from '../../../lib/hooks/useSongViewSettings.js';
import { cn } from '../../../lib/utils.js';

export interface TransposeBarProps {
  originalKey?: string | null;
  offset: number;
  onChangeOffset: (newOffset: number) => void;
  onReset: () => void;
  className?: string;

  // Font size controls
  fontSize?: number;
  onIncreaseFontSize?: () => void;
  onDecreaseFontSize?: () => void;
  onResetFontSize?: () => void;

  // Column layout controls
  columns?: ColumnOption;
  preferredColumns?: ColumnOption;
  onChangeColumns?: (cols: ColumnOption) => void;
  isFallbackActive?: boolean;
}

export const TransposeBar: React.FC<TransposeBarProps> = ({
  originalKey,
  offset,
  onChangeOffset,
  onReset,
  className = '',
  fontSize = DEFAULT_FONT_SIZE,
  onIncreaseFontSize,
  onDecreaseFontSize,
  onResetFontSize,
  columns = 1,
  preferredColumns = 1,
  onChangeColumns,
  isFallbackActive = false,
}) => {
  // Current key computed from original key + offset
  const currentKey = originalKey ? transposeChord(originalKey, offset) : null;

  // Keyboard shortcut listener (↑ / ↓ for transpose)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in form controls or editable elements
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

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        onChangeOffset(offset + 1);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        onChangeOffset(offset - 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [offset, onChangeOffset]);

  const formatOffset = (val: number) => {
    if (val > 0) return `+${val}`;
    return `${val}`;
  };

  return (
    <div
      className={cn(
        'sticky top-16 z-20 bg-white/95 dark:bg-[#17251E]/95 backdrop-blur-md border border-[#E4E9E3] dark:border-[#2A4033] rounded-2xl p-3 sm:p-3.5 shadow-sm print:hidden transition-all duration-150',
        className
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4">
        {/* 1. Transpose & Key Indicator */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider text-[#647067] dark:text-[#A8B9AE] font-semibold">
              Key &amp; Pitch
            </span>
            <div className="flex items-center gap-1.5 sm:gap-2">
              {currentKey ? (
                <>
                  <span className="text-base sm:text-lg font-bold text-[#1C2924] dark:text-[#F0F5F0] font-mono">
                    {currentKey}
                  </span>
                  {offset !== 0 && (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#E8F1E9] dark:bg-[#24372C] text-[#146C43] dark:text-[#6FCF97] border border-[#198754]/20 dark:border-[#6FCF97]/20 font-mono">
                      {formatOffset(offset)}
                    </span>
                  )}
                  {originalKey && offset !== 0 && (
                    <span className="text-xs text-[#647067] dark:text-[#A8B9AE]">
                      (orig: {originalKey})
                    </span>
                  )}
                </>
              ) : (
                <span className="text-xs sm:text-sm font-semibold text-[#1C2924] dark:text-[#F0F5F0] font-mono">
                  Offset: {formatOffset(offset)}
                </span>
              )}
            </div>
          </div>

          {/* Transpose Controls */}
          <div className="flex items-center gap-1 ml-1 sm:ml-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onChangeOffset(offset - 1)}
              title="Down 1 semitone (Down Arrow key)"
              aria-label="Down 1 semitone"
              className="px-2.5 py-1.5 min-h-[36px] min-w-[36px]"
            >
              <Minus className="w-3.5 h-3.5" />
              <span className="text-xs font-semibold sm:inline">-1</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onChangeOffset(offset + 1)}
              title="Up 1 semitone (Up Arrow key)"
              aria-label="Up 1 semitone"
              className="px-2.5 py-1.5 min-h-[36px] min-w-[36px]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="text-xs font-semibold sm:inline">+1</span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onReset}
              disabled={offset === 0}
              title="Reset key transposition"
              aria-label="Reset key transposition"
              className="px-2 py-1.5 text-xs min-h-[36px]"
            >
              <RotateCcw className="w-3 h-3" />
              <span className="hidden sm:inline">Reset</span>
            </Button>
          </div>
        </div>

        {/* 2. Reading Controls (Font Size & Column Layout) */}
        <div className="flex items-center gap-3 sm:gap-4 flex-wrap ml-auto">
          {/* Font Size Selector */}
          {onIncreaseFontSize && onDecreaseFontSize && (
            <div className="flex items-center gap-1.5">
              <div className="flex flex-col sm:items-end">
                <span className="text-[10px] uppercase tracking-wider text-[#647067] dark:text-[#A8B9AE] font-semibold">
                  Font
                </span>
                <span className="font-mono text-xs font-bold text-[#146C43] dark:text-[#6FCF97] px-1">
                  {fontSize}px
                </span>
              </div>

              <div className="flex items-center gap-1 bg-[#FAFAF6] dark:bg-[#101A16] p-1 rounded-xl border border-[#E4E9E3] dark:border-[#2A4033]">
                {/* A- button */}
                <button
                  type="button"
                  onClick={onDecreaseFontSize}
                  disabled={fontSize <= MIN_FONT_SIZE}
                  className="px-2 py-1 rounded-lg text-xs font-bold text-[#1C2924] dark:text-[#F0F5F0] hover:bg-[#E8F1E9] dark:hover:bg-[#24372C] disabled:opacity-30 disabled:pointer-events-none transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center"
                  title="Decrease font size (A-)"
                  aria-label="Decrease font size"
                >
                  <span className="text-xs">A−</span>
                </button>

                {/* A+ button */}
                <button
                  type="button"
                  onClick={onIncreaseFontSize}
                  disabled={fontSize >= MAX_FONT_SIZE}
                  className="px-2 py-1 rounded-lg text-xs font-bold text-[#1C2924] dark:text-[#F0F5F0] hover:bg-[#E8F1E9] dark:hover:bg-[#24372C] disabled:opacity-30 disabled:pointer-events-none transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center"
                  title="Increase font size (A+)"
                  aria-label="Increase font size"
                >
                  <span className="text-xs">A+</span>
                </button>

                {/* Reset button */}
                {onResetFontSize && (
                  <button
                    type="button"
                    onClick={onResetFontSize}
                    disabled={fontSize === DEFAULT_FONT_SIZE}
                    className="p-1 rounded-lg text-[#647067] dark:text-[#A8B9AE] hover:text-[#1C2924] dark:hover:text-[#F0F5F0] hover:bg-[#E8F1E9] dark:hover:bg-[#24372C] disabled:opacity-30 disabled:pointer-events-none transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center"
                    title="Reset font size to 18px"
                    aria-label="Reset font size to 18px"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Column Layout Selector */}
          {onChangeColumns && (
            <div className="flex items-center gap-1.5">
              <div className="flex flex-col sm:items-end">
                <span className="text-[10px] uppercase tracking-wider text-[#647067] dark:text-[#A8B9AE] font-semibold">
                  Columns
                </span>
                <span className="text-xs font-medium text-[#647067] dark:text-[#A8B9AE] px-1">
                  {columns} {columns === 1 ? 'col' : 'cols'}
                  {isFallbackActive && (
                    <span className="text-[10px] text-[#A16207] dark:text-[#FBBF24] ml-1 font-bold">
                      (auto)
                    </span>
                  )}
                </span>
              </div>

              {/* Segmented Column Buttons */}
              <div
                className="flex items-center gap-0.5 p-1 bg-[#FAFAF6] dark:bg-[#101A16] rounded-xl border border-[#E4E9E3] dark:border-[#2A4033]"
                role="group"
                aria-label="Song Column Layout"
              >
                {/* 1 Column */}
                <button
                  type="button"
                  onClick={() => onChangeColumns(1)}
                  className={cn(
                    'flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold transition-all min-h-[32px]',
                    preferredColumns === 1
                      ? 'bg-[#198754] text-white shadow-xs'
                      : 'text-[#647067] dark:text-[#A8B9AE] hover:bg-[#E8F1E9] dark:hover:bg-[#24372C] hover:text-[#1C2924] dark:hover:text-[#F0F5F0]'
                  )}
                  title="Single column"
                  aria-label="Single column layout"
                  aria-pressed={preferredColumns === 1}
                >
                  <RectangleVertical className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">1</span>
                </button>

                {/* 2 Columns */}
                <button
                  type="button"
                  onClick={() => onChangeColumns(2)}
                  className={cn(
                    'flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold transition-all min-h-[32px]',
                    preferredColumns === 2
                      ? 'bg-[#198754] text-white shadow-xs'
                      : 'text-[#647067] dark:text-[#A8B9AE] hover:bg-[#E8F1E9] dark:hover:bg-[#24372C] hover:text-[#1C2924] dark:hover:text-[#F0F5F0]'
                  )}
                  title="Two columns"
                  aria-label="Two columns layout"
                  aria-pressed={preferredColumns === 2}
                >
                  <Columns2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">2</span>
                </button>

                {/* 3 Columns */}
                <button
                  type="button"
                  onClick={() => onChangeColumns(3)}
                  className={cn(
                    'flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold transition-all min-h-[32px]',
                    preferredColumns === 3
                      ? 'bg-[#198754] text-white shadow-xs'
                      : 'text-[#647067] dark:text-[#A8B9AE] hover:bg-[#E8F1E9] dark:hover:bg-[#24372C] hover:text-[#1C2924] dark:hover:text-[#F0F5F0]'
                  )}
                  title="Three columns (wide displays)"
                  aria-label="Three columns layout"
                  aria-pressed={preferredColumns === 3}
                >
                  <Columns3 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">3</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
