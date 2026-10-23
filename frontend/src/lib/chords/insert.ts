/**
 * Pure helper function to insert inline chord notation [CHORD] at cursor or replacing selection.
 * Used by the Chord Insertion Toolbar and verified in unit tests.
 */
export function insertChordAtCursor(
  text: string,
  selectionStart: number,
  selectionEnd: number,
  chord: string
): { newText: string; newCursor: number } {
  const token = `[${chord}]`;
  const start = Math.max(0, Math.min(selectionStart, text.length));
  const end = Math.max(start, Math.min(selectionEnd, text.length));

  const before = text.slice(0, start);
  const after = text.slice(end);

  const newText = `${before}${token}${after}`;
  const newCursor = start + token.length;

  return { newText, newCursor };
}
