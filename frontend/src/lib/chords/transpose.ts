import {
  getNoteSemitone,
  getNoteFromSemitone,
  FLAT_KEYS,
} from './notes.js';
import { isChord } from './parse.js';

// Regex to capture root note, chord suffix/extension, and optional slash bass note
const CHORD_REGEX = /^([A-G][#b]?)([^/]*)(?:\/([A-G][#b]?))?$/;

/**
 * Transpose an individual note by a semitone offset
 */
export function transposeNote(note: string, semitones: number, preferFlats: boolean = false): string {
  const currentSemitone = getNoteSemitone(note);
  if (currentSemitone === -1) {
    return note;
  }
  const newSemitone = ((currentSemitone + semitones) % 12 + 12) % 12;
  return getNoteFromSemitone(newSemitone, preferFlats);
}

/**
 * Transpose a single chord symbol (e.g. 'Am', 'C#m7', 'C/E', 'Bbadd9')
 */
export function transposeChord(
  chord: string,
  semitones: number,
  preferFlats: boolean = false
): string {
  if (semitones === 0 || !chord) {
    return chord;
  }

  const trimmed = chord.trim();
  if (!isChord(trimmed)) {
    return chord;
  }

  const match = trimmed.match(CHORD_REGEX);
  if (!match) {
    return chord;
  }

  const [, root, suffix, bass] = match;
  if (getNoteSemitone(root) === -1) {
    return chord;
  }

  const newRoot = transposeNote(root, semitones, preferFlats);
  const newBass = bass ? `/${transposeNote(bass, semitones, preferFlats)}` : '';

  return `${newRoot}${suffix || ''}${newBass}`;
}

/**
 * Transpose an entire song content string containing inline chords like [C]Amazing [G]grace
 */
export function transposeContent(
  content: string,
  semitones: number,
  originalKey?: string | null
): string {
  if (semitones === 0 || !content) {
    return content;
  }

  // Determine accidental preference based on key if available
  let preferFlats = false;
  if (originalKey) {
    const targetKey = transposeChord(originalKey, semitones);
    preferFlats = FLAT_KEYS.has(targetKey);
  }

  return content.replace(/\[([^\]]+)\]/g, (match, chord) => {
    if (!isChord(chord)) {
      return match;
    }
    return `[${transposeChord(chord, semitones, preferFlats)}]`;
  });
}
