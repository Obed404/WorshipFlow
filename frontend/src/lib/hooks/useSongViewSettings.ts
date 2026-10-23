import { useState, useEffect, useCallback } from 'react';

const FONT_SIZE_KEY = 'chord_viewer_font_size';
const COLUMNS_KEY = 'chord_viewer_columns';

export const MIN_FONT_SIZE = 12;
export const MAX_FONT_SIZE = 36;
export const DEFAULT_FONT_SIZE = 18;
export const FONT_SIZE_STEP = 2;

export type ColumnOption = 1 | 2 | 3;

export interface SongViewSettings {
  fontSize: number;
  preferredColumns: ColumnOption;
  activeColumns: ColumnOption;
  isFallbackActive: boolean;
  viewportWidth: number;
  setFontSize: (size: number) => void;
  increaseFontSize: () => void;
  decreaseFontSize: () => void;
  resetFontSize: () => void;
  setPreferredColumns: (columns: ColumnOption) => void;
}

export function useSongViewSettings(): SongViewSettings {
  // 1. Font Size State with LocalStorage Persistence
  const [fontSize, setFontSizeState] = useState<number>(() => {
    try {
      const stored = localStorage.getItem(FONT_SIZE_KEY);
      if (stored) {
        const parsed = parseInt(stored, 10);
        if (!isNaN(parsed) && parsed >= MIN_FONT_SIZE && parsed <= MAX_FONT_SIZE) {
          return parsed;
        }
      }
    } catch {
      // Ignore localStorage errors
    }
    return DEFAULT_FONT_SIZE;
  });

  const setFontSize = useCallback((size: number) => {
    const clamped = Math.max(MIN_FONT_SIZE, Math.min(MAX_FONT_SIZE, size));
    setFontSizeState(clamped);
    try {
      localStorage.setItem(FONT_SIZE_KEY, clamped.toString());
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const increaseFontSize = useCallback(() => {
    setFontSizeState((prev) => {
      const next = Math.min(MAX_FONT_SIZE, prev + FONT_SIZE_STEP);
      try {
        localStorage.setItem(FONT_SIZE_KEY, next.toString());
      } catch {}
      return next;
    });
  }, []);

  const decreaseFontSize = useCallback(() => {
    setFontSizeState((prev) => {
      const next = Math.max(MIN_FONT_SIZE, prev - FONT_SIZE_STEP);
      try {
        localStorage.setItem(FONT_SIZE_KEY, next.toString());
      } catch {}
      return next;
    });
  }, []);

  const resetFontSize = useCallback(() => {
    setFontSizeState(DEFAULT_FONT_SIZE);
    try {
      localStorage.setItem(FONT_SIZE_KEY, DEFAULT_FONT_SIZE.toString());
    } catch {}
  }, []);

  // 2. Multi-column Layout State with LocalStorage Persistence
  const [preferredColumns, setPreferredColumnsState] = useState<ColumnOption>(() => {
    try {
      const stored = localStorage.getItem(COLUMNS_KEY);
      if (stored === '1' || stored === '2' || stored === '3') {
        return parseInt(stored, 10) as ColumnOption;
      }
    } catch {}
    return 1;
  });

  const setPreferredColumns = useCallback((cols: ColumnOption) => {
    setPreferredColumnsState(cols);
    try {
      localStorage.setItem(COLUMNS_KEY, cols.toString());
    } catch {}
  }, []);

  // 3. Viewport width tracking for responsive column fallback
  const [viewportWidth, setViewportWidth] = useState<number>(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1200
  );

  useEffect(() => {
    let timeoutId: any;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setViewportWidth(window.innerWidth);
      }, 100);
    };

    window.addEventListener('resize', handleResize, { passive: true });
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Compute active columns based on viewport boundaries:
  // - Below 640px: single column fallback
  // - 640px to 1023px: max 2 columns
  // - 1024px+: allows 1, 2, or 3 columns
  const activeColumns: ColumnOption = (() => {
    if (viewportWidth < 640) {
      return 1;
    }
    if (viewportWidth < 1024) {
      return Math.min(2, preferredColumns) as ColumnOption;
    }
    return preferredColumns;
  })();

  const isFallbackActive = preferredColumns !== activeColumns;

  return {
    fontSize,
    preferredColumns,
    activeColumns,
    isFallbackActive,
    viewportWidth,
    setFontSize,
    increaseFontSize,
    decreaseFontSize,
    resetFontSize,
    setPreferredColumns,
  };
}
