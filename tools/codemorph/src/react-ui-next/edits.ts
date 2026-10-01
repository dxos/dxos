//
// Copyright 2026 DXOS.org
//

/** A replacement of `[start, end)` in the original text. */
export type Edit = {
  start: number;
  end: number;
  text: string;
};

/** An insertion sorts before a replacement at the same position, so it lands in front of the replaced text. */
const isInsert = (edit: Edit) => (edit.start === edit.end ? 1 : 0);

/**
 * Applies non-overlapping edits to `text`.
 * Edits at the same position keep their insertion order; an overlapping edit throws, since it means two rules
 * claimed the same source and the output would be undefined.
 */
export const applyEdits = (text: string, edits: Edit[]): string => {
  const sorted = edits
    .map((edit, index) => ({ edit, index }))
    .sort((a, b) => a.edit.start - b.edit.start || isInsert(b.edit) - isInsert(a.edit) || a.index - b.index);
  let result = '';
  let cursor = 0;
  for (const { edit } of sorted) {
    if (edit.start < cursor) {
      throw new Error(`Overlapping edit at ${edit.start}: ${JSON.stringify(edit.text)}`);
    }
    result += text.slice(cursor, edit.start) + edit.text;
    cursor = edit.end;
  }
  return result + text.slice(cursor);
};

/** Widens `[start, end)` to whole lines when nothing else shares them, so a removed tag leaves no blank line. */
export const lineRange = (text: string, start: number, end: number): { start: number; end: number } => {
  let lineStart = start;
  while (lineStart > 0 && (text[lineStart - 1] === ' ' || text[lineStart - 1] === '\t')) {
    lineStart--;
  }
  let lineEnd = end;
  while (lineEnd < text.length && (text[lineEnd] === ' ' || text[lineEnd] === '\t')) {
    lineEnd++;
  }
  const ownsLine =
    (lineStart === 0 || text[lineStart - 1] === '\n') && (lineEnd === text.length || text[lineEnd] === '\n');
  return ownsLine ? { start: lineStart, end: Math.min(lineEnd + 1, text.length) } : { start, end };
};
