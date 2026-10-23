import React, { useMemo } from 'react';
import { transposeContent, parseSongContent, type ParsedLine } from '../../../lib/chords/index.js';
import { cn } from '../../../lib/utils.js';

export interface ChordSheetProps {
  content: string;
  transposeOffset?: number;
  originalKey?: string | null;
  className?: string;
  fontSize?: number; // In pixels (e.g. 18)
  columns?: 1 | 2 | 3;
}

export interface SongSection {
  headerText?: string;
  lines: ParsedLine[];
}

/**
 * Group parsed lines into logical song sections/stanzas
 * Sections break on explicit headers or empty lines between stanzas
 */
export function groupLinesIntoSections(parsedLines: ParsedLine[]): SongSection[] {
  const sections: SongSection[] = [];
  let currentSection: SongSection = { lines: [] };

  for (let i = 0; i < parsedLines.length; i++) {
    const line = parsedLines[i];

    if (line.isSectionHeader) {
      if (currentSection.headerText || currentSection.lines.length > 0) {
        sections.push(currentSection);
      }
      currentSection = { headerText: line.headerText, lines: [] };
    } else {
      const isEmpty =
        line.chunks.length === 0 ||
        (line.chunks.length === 1 && !line.chunks[0].chord && !line.chunks[0].lyrics.trim());

      if (isEmpty) {
        if (currentSection.lines.length > 0) {
          sections.push(currentSection);
          currentSection = { lines: [] };
        }
      } else {
        currentSection.lines.push(line);
      }
    }
  }

  if (currentSection.headerText || currentSection.lines.length > 0) {
    sections.push(currentSection);
  }

  return sections.length > 0 ? sections : [{ lines: [] }];
}

/**
 * Distribute sections across 1, 2, or 3 columns evenly
 * Preserves every chord, lyric, chunk and section without omission or duplication
 */
export function distributeSectionsToColumns(
  sections: SongSection[],
  numColumns: 1 | 2 | 3
): SongSection[][] {
  if (numColumns === 1 || sections.length === 0) {
    return [sections];
  }

  // Pre-split oversized sections so every column gets content
  const splitSections: SongSection[] = [];
  const totalRawLines = sections.reduce((sum, s) => sum + s.lines.length, 0);
  const targetLinesPerCol = Math.max(3, Math.ceil(totalRawLines / numColumns));

  for (const sec of sections) {
    if (sections.length < numColumns && sec.lines.length > targetLinesPerCol) {
      const chunkSize = Math.ceil(sec.lines.length / (numColumns - sections.length + 1));
      for (let i = 0; i < sec.lines.length; i += chunkSize) {
        const slice = sec.lines.slice(i, i + chunkSize);
        splitSections.push({
          headerText: i === 0 ? sec.headerText : sec.headerText ? `${sec.headerText} (cont.)` : undefined,
          lines: slice,
        });
      }
    } else {
      splitSections.push(sec);
    }
  }

  // If still fewer sections than columns, divide the longest section
  while (splitSections.length < numColumns) {
    let longestIdx = 0;
    for (let i = 1; i < splitSections.length; i++) {
      if (splitSections[i].lines.length > splitSections[longestIdx].lines.length) {
        longestIdx = i;
      }
    }
    const longest = splitSections[longestIdx];
    if (longest.lines.length < 2) break; // Cannot divide single line
    const mid = Math.ceil(longest.lines.length / 2);
    const part1: SongSection = {
      headerText: longest.headerText,
      lines: longest.lines.slice(0, mid),
    };
    const part2: SongSection = {
      headerText: longest.headerText ? `${longest.headerText} (cont.)` : undefined,
      lines: longest.lines.slice(mid),
    };
    splitSections.splice(longestIdx, 1, part1, part2);
  }

  const columns: SongSection[][] = Array.from({ length: numColumns }, () => []);
  const columnLineCounts = new Array(numColumns).fill(0);
  const totalAdjustedLines = splitSections.reduce(
    (sum, s) => sum + s.lines.length + (s.headerText ? 1 : 0),
    0
  );
  const idealPerCol = totalAdjustedLines / numColumns;

  let currentCol = 0;
  for (let i = 0; i < splitSections.length; i++) {
    const sec = splitSections[i];
    const secWeight = sec.lines.length + (sec.headerText ? 1 : 0);
    const remainingSections = splitSections.length - i;
    const remainingCols = numColumns - currentCol;

    // Must move to next column if remaining sections equal remaining empty columns
    if (remainingCols > 1 && remainingSections === remainingCols && columnLineCounts[currentCol] > 0) {
      currentCol++;
    } else if (
      currentCol < numColumns - 1 &&
      columnLineCounts[currentCol] > 0 &&
      columnLineCounts[currentCol] + secWeight / 2 > idealPerCol
    ) {
      currentCol++;
    }

    columns[currentCol].push(sec);
    columnLineCounts[currentCol] += secWeight;
  }

  return columns;
}

export const ChordSheet: React.FC<ChordSheetProps> = ({
  content,
  transposeOffset = 0,
  originalKey,
  className = '',
  fontSize = 18,
  columns = 1,
}) => {
  // Transpose and parse content into structured lines and chunks
  const parsedLines = useMemo(() => {
    const transposed = transposeContent(content, transposeOffset, originalKey);
    return parseSongContent(transposed);
  }, [content, transposeOffset, originalKey]);

  // Group parsed lines into logical song sections/stanzas
  const songSections = useMemo(() => {
    return groupLinesIntoSections(parsedLines);
  }, [parsedLines]);

  // Distribute sections across the requested number of columns
  const columnSections = useMemo(() => {
    return distributeSectionsToColumns(songSections, columns);
  }, [songSections, columns]);

  if (!content || parsedLines.length === 0) {
    return (
      <div className="text-[#647067] dark:text-[#A8B9AE] italic text-sm py-4">
        No lyrics or chords available.
      </div>
    );
  }

  const renderSection = (sec: SongSection, key: string | number) => (
    <div key={key} className="mb-4 first:mt-0">
      {/* Section Header (e.g. [Chorus], [Verse 1]) */}
      {sec.headerText && (
        <div className="font-sans font-bold text-[#1C2924] dark:text-[#F0F5F0] text-xs tracking-wider uppercase bg-[#E8F1E9] dark:bg-[#24372C] px-2.5 py-1 rounded inline-block mb-2.5 print:border print:border-[#E4E9E3]">
          {sec.headerText}
        </div>
      )}

      {/* Section Content Lines */}
      {sec.lines.map((line, lineIndex) => {
        // Empty line between stanzas / verses
        if (
          line.chunks.length === 0 ||
          (line.chunks.length === 1 && !line.chunks[0].chord && !line.chunks[0].lyrics.trim())
        ) {
          return <div key={lineIndex} className="h-[1.2em]" />;
        }

        // Lyric & Chord Line
        return (
          <div
            key={lineIndex}
            className="flex flex-wrap items-end min-h-[2.6em] py-0.5 overflow-x-auto"
          >
            {line.chunks.map((chunk, chunkIndex) => {
              const hasChord = Boolean(chunk.chord);
              const hasLyrics = Boolean(chunk.lyrics);

              return (
                <div key={chunkIndex} className="inline-flex flex-col align-bottom shrink-0">
                  {/* Chord rendered above lyric syllable */}
                  <span
                    className="font-semibold text-[#146C43] dark:text-[#6FCF97] print:text-[#146C43] font-mono select-none h-[1.3em] leading-[1.3em] whitespace-pre pr-1"
                    style={{ fontSize: '0.82em' }}
                  >
                    {hasChord ? chunk.chord : '\u00A0'}
                  </span>

                  {/* Lyric text below chord */}
                  <span className="text-[#1C2924] dark:text-[#F0F5F0] print:text-[#1C2924] whitespace-pre leading-[1.3em]">
                    {hasLyrics ? chunk.lyrics : '\u00A0'}
                  </span>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );

  return (
    <div
      style={{ fontSize: `${fontSize}px` }}
      className={`font-mono leading-relaxed select-text transition-all duration-150 pb-4 w-full ${className}`}
    >
      {columns === 1 ? (
        <div className="w-full space-y-4">
          {songSections.map((sec, secIdx) => renderSection(sec, secIdx))}
        </div>
      ) : columns === 2 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 items-start w-full">
          {columnSections.map((col, colIdx) => (
            <div
              key={colIdx}
              className={cn(
                'min-w-0 space-y-4 w-full',
                colIdx > 0 &&
                  'border-t md:border-t-0 md:border-l border-dashed border-[#E4E9E3] dark:border-[#2A4033] pt-4 md:pt-0 md:pl-6 lg:pl-8'
              )}
            >
              {col.map((sec, secIdx) => renderSection(sec, `${colIdx}-${secIdx}`))}
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 items-start w-full">
          {columnSections.map((col, colIdx) => (
            <div
              key={colIdx}
              className={cn(
                'min-w-0 space-y-4 w-full',
                colIdx > 0 &&
                  'border-t md:border-t-0 md:border-l border-dashed border-[#E4E9E3] dark:border-[#2A4033] pt-4 md:pt-0 md:pl-6 lg:pl-8'
              )}
            >
              {col.map((sec, secIdx) => renderSection(sec, `${colIdx}-${secIdx}`))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
