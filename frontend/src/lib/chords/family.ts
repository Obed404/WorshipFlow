import {
  getNoteSemitone,
  getNoteFromSemitone,
  normalizeNote,
  FLAT_KEYS,
} from './notes.js';

export interface ChordFamilyDegree {
  roman: string;
  name: string;
  chord: string;
}

export interface ChordFamilyResult {
  key: string;
  root: string;
  isMinor: boolean;
  displayName: string;
  degrees: ChordFamilyDegree[];
  chords: string[];
}

/**
 * Parses user key string into normalized root and minor flag.
 * Supports: 'C', 'G', 'Am', 'c#m', 'bb', 'F# minor', 'D major', 'Eb', etc.
 */
export function parseKey(input: string | null | undefined): { root: string; isMinor: boolean } | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Extract root note (A-G followed by optional # or b) and the rest
  const match = trimmed.match(/^([A-Ga-g][#b]?)(.*)$/);
  if (!match) return null;

  const rawRoot = match[1];
  const root = normalizeNote(rawRoot);
  if (getNoteSemitone(root) === -1) return null;

  const rawRest = match[2].trim().toLowerCase();
  // Detect minor notation (m, min, minor, -) but not maj/major
  const isMinor =
    /^(m|min|minor|-)(\b|[^a-z])/i.test(rawRest) ||
    rawRest === 'm' ||
    rawRest === 'min' ||
    rawRest === 'minor';

  return { root, isMinor };
}

/**
 * Computes diatonic family chords for any major or minor key.
 *
 * For Major Keys (e.g. G):
 * I (G), ii (Am), iii (Bm), IV (C), V (D), V7 (D7), vi (Em), vii° (F#dim)
 *
 * For Minor Keys (e.g. Am):
 * i (Am), ii° (Bdim), III (C), iv (Dm), v (Em), V (E), V7 (E7), VI (F), VII (G), VII7 (G7)
 */
export function getChordFamily(keyInput: string | null | undefined): ChordFamilyResult {
  const parsed = parseKey(keyInput);
  const root = parsed ? parsed.root : 'C';
  const isMinor = parsed ? parsed.isMinor : false;

  const rootSemitone = getNoteSemitone(root);
  const effectiveSemitone = rootSemitone === -1 ? 0 : rootSemitone;

  // Check if key prefers flats or sharps
  const keyIdentifier = isMinor ? `${root}m` : root;
  const preferFlats = FLAT_KEYS.has(keyIdentifier) || root.includes('b');

  const getNote = (interval: number) => {
    return getNoteFromSemitone(effectiveSemitone + interval, preferFlats);
  };

  const degrees: ChordFamilyDegree[] = isMinor
    ? [
        { roman: 'i', name: 'Tonic', chord: `${root}m` },
        { roman: 'III', name: 'Rel. Major', chord: getNote(3) },
        { roman: 'iv', name: 'Subdominant', chord: `${getNote(5)}m` },
        { roman: 'v', name: 'Minor Dominant', chord: `${getNote(7)}m` },
        { roman: 'V', name: 'Dominant', chord: getNote(7) },
        { roman: 'V7', name: 'Dominant 7th', chord: `${getNote(7)}7` },
        { roman: 'VI', name: 'Submediant', chord: getNote(8) },
        { roman: 'VII', name: 'Subtonic', chord: getNote(10) },
        { roman: 'VII7', name: 'Subtonic 7th', chord: `${getNote(10)}7` },
        { roman: 'ii°', name: 'Leading / Dim', chord: `${getNote(2)}dim` },
      ]
    : [
        { roman: 'I', name: 'Tonic', chord: root },
        { roman: 'ii', name: 'Supertonic', chord: `${getNote(2)}m` },
        { roman: 'iii', name: 'Mediant', chord: `${getNote(4)}m` },
        { roman: 'IV', name: 'Subdominant', chord: getNote(5) },
        { roman: 'V', name: 'Dominant', chord: getNote(7) },
        { roman: 'V7', name: 'Dominant 7th', chord: `${getNote(7)}7` },
        { roman: 'vi', name: 'Rel. Minor', chord: `${getNote(9)}m` },
        { roman: 'vii°', name: 'Leading Tone', chord: `${getNote(11)}dim` },
      ];

  const chords = degrees.map((d) => d.chord);
  const displayName = isMinor ? `${root} Minor` : `${root} Major`;
  const keyFormatted = isMinor ? `${root}m` : root;

  return {
    key: keyFormatted,
    root,
    isMinor,
    displayName,
    degrees,
    chords,
  };
}
