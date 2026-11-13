//
// Copyright 2026 DXOS.org
//

// The trailing HTML comment of a slide (its notes); the body may not contain `-->`.
const NOTES = /<!--((?:(?!-->)[\s\S])*)-->\s*$/;

const BULLET = /^(?:[-*+]|\d+[.)])\s+/;

/**
 * The speaker notes written in a markdown slide: its trailing HTML comment, trimmed; undefined when there is none.
 */
export const extractNotes = (content: string): string | undefined => {
  const notes = NOTES.exec(content)?.[1].trim();
  return notes ? notes : undefined;
};

/**
 * Splits speaker notes into the lines read aloud: one per bullet or paragraph (an indented or wrapped line joins the
 * one above), each split again after a sentence's `.`, `!` or `?`, so a breath falls at every line end.
 */
export const getSpeakerLines = (notes: string | undefined): string[] => {
  if (!notes) {
    return [];
  }

  const items: string[] = [];
  let current: string | undefined;
  const flush = () => {
    if (current !== undefined && current.trim().length > 0) {
      items.push(current.trim());
    }
    current = undefined;
  };

  for (const raw of notes.split(/\r?\n/)) {
    const line = raw.trim();
    if (line.length === 0) {
      flush();
    } else if (BULLET.test(line)) {
      flush();
      current = line.replace(BULLET, '');
    } else {
      current = current === undefined ? line : `${current} ${line}`;
    }
  }
  flush();

  return items.flatMap((item) =>
    item
      .replace(/\s+/g, ' ')
      .split(/(?<=[.!?])\s+/)
      .filter((sentence) => sentence.length > 0),
  );
};
