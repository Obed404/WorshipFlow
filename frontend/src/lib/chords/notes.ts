export const SHARP_NOTES = [
  'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'
] as const;

export const FLAT_NOTES = [
  'C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'
] as const;

// Key accidentals preferences
export const FLAT_KEYS = new Set([
  'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb',
  'Dm', 'Gm', 'Cm', 'Fm', 'Bbm', 'Ebm'
]);

/**
 * Normalizes note name string (e.g. 'c#' -> 'C#', 'bb' -> 'Bb')
 */
export function normalizeNote(note: string): string {
  if (!note || note.length === 0) return '';
  const first = note.charAt(0).toUpperCase();
  const rest = note.slice(1).toLowerCase();
  return `${first}${rest}`;
}

/**
 * Get semitone value (0-11) for a given note
 */
export function getNoteSemitone(note: string): number {
  const normalized = normalizeNote(note);
  const sharpIndex = SHARP_NOTES.indexOf(normalized as any);
  if (sharpIndex !== -1) return sharpIndex;

  const flatIndex = FLAT_NOTES.indexOf(normalized as any);
  if (flatIndex !== -1) return flatIndex;

  return -1;
}

/**
 * Get note name from semitone offset (0-11)
 */
export function getNoteFromSemitone(semitone: number, preferFlats: boolean = false): string {
  const normalizedSemitone = ((semitone % 12) + 12) % 12;
  return preferFlats ? FLAT_NOTES[normalizedSemitone] : SHARP_NOTES[normalizedSemitone];
}
