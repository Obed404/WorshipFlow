import { describe, it, expect } from 'bun:test';
import {
  isChord,
  transposeChord,
  transposeContent,
  parseTokens,
  parseSongContent,
  parseLineToChunks,
  getNoteSemitone,
} from './lib/chords/index.js';
import {
  groupLinesIntoSections,
  distributeSectionsToColumns,
} from './modules/songs/components/ChordSheet.js';

describe('Chord Engine Unit Tests', () => {
  it('correctly maps semitones for notes', () => {
    expect(getNoteSemitone('C')).toBe(0);
    expect(getNoteSemitone('D')).toBe(2);
    expect(getNoteSemitone('F#')).toBe(6);
    expect(getNoteSemitone('Bb')).toBe(10);
  });

  it('correctly transposes single chords and slash chords', () => {
    expect(transposeChord('C', 2)).toBe('D');
    expect(transposeChord('Am', 2)).toBe('Bm');
    expect(transposeChord('C/E', 2)).toBe('D/F#');
    expect(transposeChord('G', -2)).toBe('F');
    expect(transposeChord('F#m7', 1)).toBe('Gm7');
    expect(transposeChord('A/C#', 3)).toBe('C/E');
  });

  it('parses inline notation into typed tokens', () => {
    const tokens = parseTokens('[C]Amazing [G]grace');
    expect(tokens.length).toBe(4);
    expect(tokens[0]).toEqual({ type: 'chord', value: 'C' });
    expect(tokens[1]).toEqual({ type: 'text', value: 'Amazing ' });
    expect(tokens[2]).toEqual({ type: 'chord', value: 'G' });
    expect(tokens[3]).toEqual({ type: 'text', value: 'grace' });
  });

  it('transposes song content preserving lyrics, line breaks, and whitespace', () => {
    const original = '[C]Amazing [G]grace, how [Am]sweet the [F]sound';
    const transposed = transposeContent(original, 2);
    expect(transposed).toBe('[D]Amazing [A]grace, how [Bm]sweet the [G]sound');
  });

  it('parses song lines into aligned chunks and detects section headers', () => {
    const song = '[Chorus]\n[C]Praise the [G]Lord\nSing along';
    const parsed = parseSongContent(song);
    expect(parsed.length).toBe(3);
    expect(parsed[0].isSectionHeader).toBe(true);
    expect(parsed[0].headerText).toBe('Chorus');
    expect(parsed[1].chunks.length).toBe(2);
    expect(parsed[1].chunks[0].chord).toBe('C');
    expect(parsed[1].chunks[0].lyrics).toBe('Praise the ');
  });

  // WF-QA-001: Complex chords recognition & non-chord rejection
  describe('WF-QA-001: Chord Recognition Tests', () => {
    it('recognizes basic, minor, seventh, and extended chords', () => {
      const chords = [
        'C', 'D', 'E', 'F', 'G', 'A', 'B',
        'Cm', 'Dm', 'Em',
        'C#m', 'F#m', 'G#m',
        'C#m7', 'F#m7', 'G#m7',
        'C#7', 'F#7', 'B7',
        'Cmaj7', 'Cmaj9', 'Cm7',
        'Cadd9', 'Csus2', 'Csus4', 'Cdim', 'Caug',
        'C7sus4', 'C#m9', 'C#maj7', 'C#m7b5', 'C#dim7',
        'C/E', 'D/F#', 'G/B', 'C#m7/G#', 'A/C#',
        'Bb', 'Eb', 'Ab', 'Db', 'Gb',
        'Bbm', 'Ebm', 'Abm',
        'Bb7', 'Eb7', 'Abmaj7',
      ];
      for (const chord of chords) {
        expect(isChord(chord)).toBe(true);
      }
    });

    it('rejects section headers, annotations, and non-chord words', () => {
      const nonChords = [
        'Verse', 'Verse 1', 'Verse 2', 'Chorus', 'Bridge', 'Intro', 'Outro',
        'Pre-Chorus', 'Hook', 'Interlude', 'Tag', 'Ending', 'Solo',
        'Quietly', 'Cello', 'Drums', 'Notes', 'Guitar solo',
      ];
      for (const word of nonChords) {
        expect(isChord(word)).toBe(false);
      }
    });
  });

  // WF-QA-002: Lyric preservation when non-chord brackets appear
  describe('WF-QA-002: Lyric Preservation Tests', () => {
    it('preserves lyrics when complex chords like C#m7 are used', () => {
      const chunks = parseLineToChunks('[C#m7]Amazing [A]grace');
      expect(chunks.length).toBe(2);
      expect(chunks[0]).toEqual({ chord: 'C#m7', lyrics: 'Amazing ' });
      expect(chunks[1]).toEqual({ chord: 'A', lyrics: 'grace' });
    });

    it('preserves lyrics when non-chord brackets are present at line start', () => {
      const chunks = parseLineToChunks('[Notes]Here is [G]God');
      expect(chunks.length).toBe(2);
      expect(chunks[0]).toEqual({ chord: null, lyrics: '[Notes]Here is ' });
      expect(chunks[1]).toEqual({ chord: 'G', lyrics: 'God' });
    });

    it('preserves lyrics when non-chord brackets appear between chords', () => {
      const chunks = parseLineToChunks('[C]Hello [Notes] world [G]there');
      expect(chunks.length).toBe(2);
      expect(chunks[0]).toEqual({ chord: 'C', lyrics: 'Hello [Notes] world ' });
      expect(chunks[1]).toEqual({ chord: 'G', lyrics: 'there' });
    });

    it('preserves lyrics when non-chord brackets appear at line end', () => {
      const chunks = parseLineToChunks('[C]Praise the Lord [Fade out]');
      expect(chunks.length).toBe(1);
      expect(chunks[0]).toEqual({ chord: 'C', lyrics: 'Praise the Lord [Fade out]' });
    });
  });

  // WF-QA-003: Section headings preserved during transposition
  describe('WF-QA-003: Section Heading Transposition Protection', () => {
    it('preserves [Bridge], [Chorus], and [Ending] during transposition', () => {
      const content = '[Verse 1]\n[C#m7]Amazing [A]grace\n[Chorus]\n[Bridge]\n[Ending]';
      const transposed = transposeContent(content, 2);
      expect(transposed).toBe('[Verse 1]\n[D#m7]Amazing [B]grace\n[Chorus]\n[Bridge]\n[Ending]');
    });

    it('does not alter non-chord words when transposeChord is invoked directly', () => {
      expect(transposeChord('Bridge', 2)).toBe('Bridge');
      expect(transposeChord('Chorus', 2)).toBe('Chorus');
      expect(transposeChord('Ending', 2)).toBe('Ending');
      expect(transposeChord('Cello', 2)).toBe('Cello');
    });
  });

  // WF-QA-006: Column Dividing & Layout Tests
  describe('WF-QA-006: Column Dividing & Layout Tests', () => {
    it('groups lines into sections based on explicit headers and blank lines', () => {
      const songWithHeaders = '[Verse 1]\n[C]Line 1\n[G]Line 2\n\n[Chorus]\n[F]Line 3\n[C]Line 4';
      const parsed = parseSongContent(songWithHeaders);
      const sections = groupLinesIntoSections(parsed);

      expect(sections.length).toBe(2);
      expect(sections[0].headerText).toBe('Verse 1');
      expect(sections[0].lines.length).toBe(2);
      expect(sections[1].headerText).toBe('Chorus');
      expect(sections[1].lines.length).toBe(2);
    });

    it('groups headerless songs into stanzas based on blank lines', () => {
      const songNoHeaders = '[C]Stanza 1 Line 1\n[G]Stanza 1 Line 2\n\n[Am]Stanza 2 Line 1\n[F]Stanza 2 Line 2';
      const parsed = parseSongContent(songNoHeaders);
      const sections = groupLinesIntoSections(parsed);

      expect(sections.length).toBe(2);
      expect(sections[0].lines.length).toBe(2);
      expect(sections[1].lines.length).toBe(2);
    });

    it('distributes multi-stanza song into 2 readable balanced columns', () => {
      const song = '[Verse 1]\n[C]V1 Line 1\n[G]V1 Line 2\n\n[Chorus]\n[F]Chorus Line 1\n[C]Chorus Line 2\n\n[Verse 2]\n[C]V2 Line 1\n[G]V2 Line 2\n\n[Chorus]\n[F]Chorus Line 1\n[C]Chorus Line 2';
      const parsed = parseSongContent(song);
      const sections = groupLinesIntoSections(parsed);
      const columns = distributeSectionsToColumns(sections, 2);

      expect(columns.length).toBe(2);
      expect(columns[0].length).toBeGreaterThan(0);
      expect(columns[1].length).toBeGreaterThan(0);

      // Verify 100% of lines are preserved without omission
      const totalColLines = columns.reduce(
        (sum, col) => sum + col.reduce((colSum, sec) => colSum + sec.lines.length, 0),
        0
      );
      const originalLines = sections.reduce((sum, s) => sum + s.lines.length, 0);
      expect(totalColLines).toBe(originalLines);
    });

    it('distributes multi-stanza song into 3 columns', () => {
      const song = '[Verse 1]\n[C]V1 Line 1\n[G]V1 Line 2\n\n[Chorus]\n[F]Chorus Line 1\n[C]Chorus Line 2\n\n[Verse 2]\n[C]V2 Line 1\n[G]V2 Line 2\n\n[Chorus]\n[F]Chorus Line 1\n[C]Chorus Line 2\n\n[Bridge]\n[Am]Bridge 1\n[G]Bridge 2';
      const parsed = parseSongContent(song);
      const sections = groupLinesIntoSections(parsed);
      const columns = distributeSectionsToColumns(sections, 3);

      expect(columns.length).toBe(3);
      expect(columns[0].length).toBeGreaterThan(0);
      expect(columns[1].length).toBeGreaterThan(0);
      expect(columns[2].length).toBeGreaterThan(0);

      // Verify line count equality
      const totalColLines = columns.reduce(
        (sum, col) => sum + col.reduce((colSum, sec) => colSum + sec.lines.length, 0),
        0
      );
      const originalLines = sections.reduce((sum, s) => sum + s.lines.length, 0);
      expect(totalColLines).toBe(originalLines);
    });

    it('splits a single continuous long verse across 2 or 3 columns so no column is empty', () => {
      // 12 lines in 1 single continuous verse
      const longVerse = Array.from({ length: 12 }, (_, i) => `[C]Line ${i + 1}`).join('\n');
      const parsed = parseSongContent(longVerse);
      const sections = groupLinesIntoSections(parsed);
      expect(sections.length).toBe(1);

      // 2 columns
      const col2 = distributeSectionsToColumns(sections, 2);
      expect(col2.length).toBe(2);
      expect(col2[0].length).toBeGreaterThan(0);
      expect(col2[1].length).toBeGreaterThan(0);
      const col2Lines = col2.reduce(
        (sum, col) => sum + col.reduce((colSum, sec) => colSum + sec.lines.length, 0),
        0
      );
      expect(col2Lines).toBe(12);

      // 3 columns
      const col3 = distributeSectionsToColumns(sections, 3);
      expect(col3.length).toBe(3);
      expect(col3[0].length).toBeGreaterThan(0);
      expect(col3[1].length).toBeGreaterThan(0);
      expect(col3[2].length).toBeGreaterThan(0);
      const col3Lines = col3.reduce(
        (sum, col) => sum + col.reduce((colSum, sec) => colSum + sec.lines.length, 0),
        0
      );
      expect(col3Lines).toBe(12);
    });

    it('gracefully handles empty content and short songs', () => {
      const emptyParsed = parseSongContent('');
      const emptySections = groupLinesIntoSections(emptyParsed);
      const emptyCol = distributeSectionsToColumns(emptySections, 2);
      expect(emptyCol.length).toBeGreaterThan(0);

      // Short 1-line song
      const shortParsed = parseSongContent('[C]Solo line');
      const shortSections = groupLinesIntoSections(shortParsed);
      const shortCol = distributeSectionsToColumns(shortSections, 2);
      expect(shortCol.length).toBe(2);
      expect(shortCol[0].length).toBe(1);
    });
  });
});
