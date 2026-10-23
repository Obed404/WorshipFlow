import { z } from 'zod';
import type {
  WorshipFlowChord,
  WorshipFlowLine,
  WorshipFlowSection,
  SectionType,
  WorshipFlowSongDocument,
} from '../types/worshipflow_song.types.js';

const SECTION_HEADER_REGEX = /^\[\s*(verse|chorus|bridge|intro|outro|pre-chorus|hook|interlude|instrumental|tag|ending|solo)[\s\d]*\]$/i;

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
 * Convert a raw bracket-annotated line (e.g. "[C]Amazing [G]grace") into a structured line
 * containing plain lyrics and exact chord character offset positions.
 */
export function parseRawLine(line: string, lineIndex: number): WorshipFlowLine {
  const chords: WorshipFlowChord[] = [];
  let plainLyrics = '';
  const regex = /\[([^\]]+)\]/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(line)) !== null) {
    // Append plain lyrics before this bracket
    if (match.index > lastIndex) {
      plainLyrics += line.slice(lastIndex, match.index);
    }

    const bracketContent = match[1];
    if (isChord(bracketContent)) {
      chords.push({
        name: bracketContent,
        position: plainLyrics.length,
      });
    } else {
      // Non-chord bracketed text is treated as lyric text
      plainLyrics += match[0];
    }

    lastIndex = regex.lastIndex;
  }

  // Trailing lyrics
  if (lastIndex < line.length) {
    plainLyrics += line.slice(lastIndex);
  }

  return {
    id: `line-${lineIndex + 1}`,
    lyrics: plainLyrics,
    chords,
  };
}

/**
 * Parses raw chord sheet text into structured WorshipFlow sections and lines.
 */
export function parseRawToStructuredSections(rawContent: string): WorshipFlowSection[] {
  if (!rawContent || !rawContent.trim()) return [];

  const rawLines = rawContent.split(/\r?\n/);
  const sections: WorshipFlowSection[] = [];
  let currentSection: WorshipFlowSection = {
    id: 'sec-1',
    type: 'verse',
    label: 'Verse 1',
    lines: [],
  };
  let sectionIndex = 1;

  for (let i = 0; i < rawLines.length; i++) {
    const rawLine = rawLines[i];
    const trimmed = rawLine.trim();

    // Check if line is a section header (e.g. [Verse 1], [Chorus])
    if (SECTION_HEADER_REGEX.test(trimmed)) {
      if (currentSection.lines.length > 0) {
        sections.push(currentSection);
        sectionIndex++;
      }

      const label = trimmed.slice(1, -1).trim();
      const match = trimmed.match(SECTION_HEADER_REGEX);
      const rawType = match ? match[1].toLowerCase() : 'other';
      const type = (rawType === 'pre-chorus' ? 'pre-chorus' : rawType) as SectionType;

      currentSection = {
        id: `sec-${sectionIndex}`,
        type,
        label,
        lines: [],
      };
    } else {
      const parsedLine = parseRawLine(rawLine, currentSection.lines.length);
      currentSection.lines.push(parsedLine);
    }
  }

  if (currentSection.lines.length > 0) {
    sections.push(currentSection);
  }

  return sections;
}

/**
 * Reconstructs raw bracket notation text from structured sections and lines.
 */
export function structuredSectionsToRaw(sections: WorshipFlowSection[]): string {
  if (!sections || sections.length === 0) return '';

  const outputLines: string[] = [];

  for (let s = 0; s < sections.length; s++) {
    const sec = sections[s];

    // Write section header if present
    if (sec.label) {
      if (outputLines.length > 0) outputLines.push('');
      outputLines.push(`[${sec.label}]`);
    }

    for (const line of sec.lines) {
      if (!line.chords || line.chords.length === 0) {
        outputLines.push(line.lyrics || '');
        continue;
      }

      // Sort chords by position descending to insert brackets without shifting earlier indices
      const sortedChords = [...line.chords].sort((a, b) => b.position - a.position);
      let reconstructed = line.lyrics || '';

      for (const chord of sortedChords) {
        const pos = Math.max(0, Math.min(reconstructed.length, chord.position));
        reconstructed = reconstructed.slice(0, pos) + `[${chord.name}]` + reconstructed.slice(pos);
      }

      outputLines.push(reconstructed);
    }
  }

  return outputLines.join('\n');
}

/**
 * Validates whether an object conforms to the WorshipFlow Song Document format.
 */
export const worshipFlowChordSchema = z.object({
  name: z.string().min(1).max(15),
  position: z.number().int().min(0),
});

export const worshipFlowLineSchema = z.object({
  id: z.string().optional().default(() => `line-${Date.now()}`),
  lyrics: z.string().default(''),
  chords: z.array(worshipFlowChordSchema).default([]),
});

export const worshipFlowSectionSchema = z.object({
  id: z.string().optional().default(() => `sec-${Date.now()}`),
  type: z.enum([
    'verse',
    'chorus',
    'bridge',
    'intro',
    'outro',
    'pre-chorus',
    'hook',
    'interlude',
    'instrumental',
    'tag',
    'ending',
    'solo',
    'other',
  ]).default('verse'),
  label: z.string().min(1).default('Verse 1'),
  lines: z.array(worshipFlowLineSchema).default([]),
});

export const worshipFlowSongSchema = z.object({
  format: z.literal('worshipflow-song'),
  version: z.literal(1).default(1),
  song: z.object({
    id: z.union([z.number(), z.string()]).optional(),
    title: z.string().min(1, 'Title is required').max(255),
    artist: z.string().max(255).nullable().optional(),
    songKey: z.string().max(10).nullable().optional(),
    capo: z.number().int().min(0).max(12).default(0),
    tempo: z.number().int().min(20).max(300).nullable().optional(),
    timeSignature: z.string().max(10).nullable().optional(),
    difficulty: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']).default('BEGINNER'),
    notes: z.string().nullable().optional(),
    tags: z.array(z.string()).optional(),
    sections: z.array(worshipFlowSectionSchema).default([]),
  }),
});

/**
 * Build a standardized WorshipFlow song document from song metadata and raw content.
 */
export function buildWorshipFlowSongDocument(song: {
  id?: number | string;
  title: string;
  artist?: string | null;
  songKey?: string | null;
  capo?: number;
  tempo?: number | null;
  difficulty?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  notes?: string | null;
  content: string;
  labels?: { name: string }[];
}): WorshipFlowSongDocument {
  const sections = parseRawToStructuredSections(song.content);

  return {
    format: 'worshipflow-song',
    version: 1,
    song: {
      id: song.id,
      title: song.title,
      artist: song.artist || null,
      songKey: song.songKey || null,
      capo: song.capo || 0,
      tempo: song.tempo || null,
      difficulty: song.difficulty || 'BEGINNER',
      notes: song.notes || null,
      tags: song.labels ? song.labels.map((l) => l.name) : [],
      sections,
    },
  };
}
