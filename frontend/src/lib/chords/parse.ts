export interface ChordToken {
  type: 'chord' | 'text';
  value: string;
}

export interface LineChunk {
  chord: string | null;
  lyrics: string;
}

export interface ParsedLine {
  isSectionHeader: boolean;
  headerText?: string;
  chunks: LineChunk[];
}

const SECTION_HEADER_REGEX = /^\[\s*(verse|chorus|bridge|intro|outro|pre-chorus|hook|interlude|tag|ending|solo)[\s\d]*\]$/i;

const CHORD_REGEX = /^[A-G][#b]?(?:(?:maj|min|dim|aug|sus|add|m|M)?\d*(?:sus[24]?|add\d+|[#b]\d+)?)*(?:\/[A-G][#b]?)?$/;

/**
 * Checks if a string inside brackets is likely a chord rather than arbitrary text or header
 */
export function isChord(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length > 15) return false;
  return CHORD_REGEX.test(trimmed);
}

/**
 * Parse a string into typed chord and text tokens, fulfilling Section 7 requirements:
 * { type: 'chord' | 'text', value: string }[]
 */
export function parseTokens(content: string): ChordToken[] {
  const tokens: ChordToken[] = [];
  const regex = /\[([^\]]+)\]/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    // Add text preceding the bracket
    if (match.index > lastIndex) {
      tokens.push({
        type: 'text',
        value: content.slice(lastIndex, match.index),
      });
    }

    const bracketContent = match[1];
    if (isChord(bracketContent)) {
      tokens.push({
        type: 'chord',
        value: bracketContent,
      });
    } else {
      // Malformed or non-chord brackets are preserved as text tokens
      tokens.push({
        type: 'text',
        value: match[0],
      });
    }

    lastIndex = regex.lastIndex;
  }

  // Add trailing text
  if (lastIndex < content.length) {
    tokens.push({
      type: 'text',
      value: content.slice(lastIndex),
    });
  }

  return tokens;
}

/**
 * Parses an individual lyric line into aligned chord-lyric chunks for rendering chords above lyrics
 */
export function parseLineToChunks(line: string): LineChunk[] {
  const chunks: LineChunk[] = [];
  const regex = /\[([^\]]+)\]/g;
  let lastIndex = 0;
  let currentChord: string | null = null;
  let pendingLyrics = '';
  let match: RegExpExecArray | null;

  while ((match = regex.exec(line)) !== null) {
    const textBefore = line.slice(lastIndex, match.index);
    const bracketContent = match[1];

    if (isChord(bracketContent)) {
      // If there was a current chord pending, pair it with any textBefore and pendingLyrics
      if (currentChord !== null) {
        chunks.push({ chord: currentChord, lyrics: pendingLyrics + textBefore });
        pendingLyrics = '';
      } else {
        // No chord was active, so pendingLyrics + textBefore are un-chorded lyrics
        const combined = pendingLyrics + textBefore;
        if (combined.length > 0) {
          chunks.push({ chord: null, lyrics: combined });
        }
        pendingLyrics = '';
      }
      currentChord = bracketContent;
    } else {
      // Non-chord bracket: accumulate textBefore and match[0] into pendingLyrics
      pendingLyrics += textBefore + match[0];
    }

    lastIndex = regex.lastIndex;
  }

  // Trailing lyrics
  const trailingText = line.slice(lastIndex);
  const finalLyrics = pendingLyrics + trailingText;

  if (currentChord !== null || finalLyrics.length > 0) {
    chunks.push({
      chord: currentChord,
      lyrics: finalLyrics,
    });
  }

  return chunks;
}

/**
 * Parses full song content into lines ready for display
 */
export function parseSongContent(content: string): ParsedLine[] {
  if (!content) return [];
  const rawLines = content.split(/\r?\n/);

  return rawLines.map(line => {
    const trimmed = line.trim();
    if (SECTION_HEADER_REGEX.test(trimmed)) {
      return {
        isSectionHeader: true,
        headerText: trimmed.slice(1, -1).trim(),
        chunks: [],
      };
    }

    return {
      isSectionHeader: false,
      chunks: parseLineToChunks(line),
    };
  });
}
