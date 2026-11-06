//
// Copyright 2026 DXOS.org
//

/** A replacement in a text; `to` is exclusive. */
export type Change = { from: number; to: number; insert: string };

/** The change that turns `before`, found at `from`, into `after`, trimmed to what differs; none when they match. */
export const minimalChange = (from: number, before: string, after: string): Change | undefined => {
  if (before === after) {
    return undefined;
  }
  let start = 0;
  while (start < before.length && start < after.length && before[start] === after[start]) {
    start++;
  }
  let end = 0;
  while (
    end < before.length - start &&
    end < after.length - start &&
    before[before.length - 1 - end] === after[after.length - 1 - end]
  ) {
    end++;
  }
  return { from: from + start, to: from + before.length - end, insert: after.slice(start, after.length - end) };
};

/** Applies changes to a text; they must not overlap. */
export const applyChanges = (text: string, changes: readonly Change[]): string =>
  [...changes]
    .sort((a, b) => b.from - a.from || b.to - a.to)
    .reduce((out, { from, to, insert }) => out.slice(0, from) + insert + out.slice(to), text);

const words = (text: string) => text.split(/\s+/).filter(Boolean);

/** Prose as paragraphs of words: blank lines separate paragraphs, other line breaks are spaces. */
export const paragraphs = (text: string): string[] =>
  text
    .split(/\n[ \t]*\n/)
    .map((paragraph) => words(paragraph).join(' '))
    .filter(Boolean);

/** Words wrapped into lines no wider than `width`, the first starting at `column` with `first` before it. */
export const wrap = (
  text: string,
  { width, column = 0, first = '', indent }: { width: number; column?: number; first?: string; indent: string },
): string[] => {
  const lines: string[] = [];
  let line = '';
  let pad = first;
  let offset = column;
  for (const word of words(text)) {
    if (line && offset + pad.length + line.length + 1 + word.length > width) {
      lines.push(pad + line);
      line = word;
      pad = indent;
      offset = 0;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  lines.push(pad + line);
  return lines;
};

/**
 * `text` written over `source`, one paragraph of a scalar's lines: the lines whose words still lead
 * `text` are kept as they are, and the rest is wrapped at the source's own width and continuation
 * indent. A one-line source stays one line, since a wrapped line would need an indent the source
 * never chose. `column` is where the source's first line starts in its line.
 */
export const reprose = (source: string, text: string, { column = 0, indent }: { column?: number; indent: string }) => {
  const lines = source.split('\n');
  const next = words(text);
  if (lines.length === 1) {
    return next.join(' ');
  }
  const continuation = lines[1].match(/^[ \t]*/)![0] || indent;
  const width = Math.max(80, column + lines[0].length, ...lines.slice(1).map((line) => line.length));
  const kept: string[] = [];
  let used = 0;
  for (const line of lines) {
    const own = words(line);
    if (own.length === 0 || own.some((word, index) => next[used + index] !== word)) {
      break;
    }
    kept.push(line);
    used += own.length;
  }
  if (used === next.length && kept.length === lines.length) {
    return source;
  }
  // Rewrap from the last kept line, so words added after it fill it before a new line starts.
  const reopened = kept.pop();
  if (reopened !== undefined) {
    used -= words(reopened).length;
  }
  const lead = reopened !== undefined ? reopened.match(/^[ \t]*/)![0] : '';
  const out = wrap(next.slice(used).join(' '), {
    width,
    column: kept.length === 0 ? column : 0,
    first: lead,
    indent: continuation,
  });
  return [...kept, ...out].join('\n');
};

/** Offsets between a decoded value and the source it was read from. */
export type OffsetMap = {
  /** The source offset of a value offset. */
  toSource: (offset: number) => number;
  /** The value offset of a source offset; undefined outside the source. */
  fromSource: (offset: number) => number | undefined;
};

const isSpace = (char: string) => /\s/.test(char);

/**
 * Maps between a value and the source at `from` it decodes, which differ in whitespace and in source
 * characters the value drops: each non-whitespace character of the value maps to the next equal one of
 * the source, and a whitespace run maps to the start of the source's.
 */
export const offsetMap = (value: string, source: string, from = 0): OffsetMap => {
  const positions = new Array<number>(value.length + 1);
  let j = 0;
  for (let i = 0; i < value.length; i++) {
    if (isSpace(value[i])) {
      positions[i] = j;
      while (i + 1 < value.length && isSpace(value[i + 1])) {
        positions[++i] = j;
      }
      while (j < source.length && isSpace(source[j])) {
        j++;
      }
      continue;
    }
    while (j < source.length && source[j] !== value[i]) {
      j++;
    }
    positions[i] = Math.min(j, source.length);
    j = Math.min(j + 1, source.length);
  }
  positions[value.length] = value.length === 0 ? 0 : Math.max(positions[value.length - 1] + 1, 0);
  positions[value.length] = Math.min(positions[value.length], source.length);
  return {
    toSource: (offset) => from + positions[Math.max(0, Math.min(offset, value.length))],
    fromSource: (offset) => {
      const local = offset - from;
      if (local < 0 || local > source.length) {
        return undefined;
      }
      // The last value offset at or before the source offset.
      let low = 0;
      let high = value.length;
      while (low < high) {
        const middle = Math.ceil((low + high) / 2);
        if (positions[middle] <= local) {
          low = middle;
        } else {
          high = middle - 1;
        }
      }
      return low;
    },
  };
};
