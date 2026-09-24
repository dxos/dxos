//
// Copyright 2026 DXOS.org
//

// Source-text helpers for the System One checker: line numbering, the segments a location
// question chooses between, windows for files too large for one state, and export extraction.
// The model cannot emit a line number, so a violation is located by choosing a segment.

/** Longest segment offered as one location option; longer declarations are split. */
const MAX_SEGMENT_LINES = 40;

/** Shortest segment kept on its own; shorter runs merge into the previous one. */
const MIN_SEGMENT_LINES = 4;

/** Location options per question; the API allows 255 and small lists answer more sharply. */
export const MAX_SEGMENTS = 60;

// A line at column zero that starts a top-level declaration or statement.
const TOP_LEVEL_RE =
  /^(?:export\s+)?(?:default\s+)?(?:declare\s+)?(?:async\s+)?(?:function|class|interface|type|enum|const|let|var|namespace|abstract\s+class)\b|^(?:describe|test|it)\s*\(/;

const EXPORT_NAME_RE =
  /^export\s+(?:declare\s+)?(?:default\s+)?(?:async\s+)?(?:function\*?|class|interface|type|enum|const|let|var|namespace|abstract\s+class)\s+([A-Za-z_$][\w$]*)/;

/** Prefix each line with its 1-based number, so segment labels and the text agree. */
export const numberLines = (lines, firstLine = 1) => {
  const width = String(firstLine + lines.length - 1).length;
  return lines.map((line, index) => `${String(firstLine + index).padStart(width)}| ${line}`).join('\n');
};

/**
 * Split lines into location segments at top-level declarations, merging tiny runs and splitting
 * long ones, then coarsening until there are at most `MAX_SEGMENTS`.
 *
 * @param {string[]} lines Lines of the text being located in.
 * @param {number} [firstLine] Line number of `lines[0]` in the file.
 * @returns {Array<{ id: string, start: number, end: number, label: string }>}
 */
export const segmentLines = (lines, firstLine = 1) => {
  if (lines.length === 0) {
    return [];
  }
  const starts = [0];
  for (let index = 1; index < lines.length; index++) {
    if (TOP_LEVEL_RE.test(lines[index])) {
      starts.push(index);
    }
  }
  let ranges = starts.map((start, index) => [start, (starts[index + 1] ?? lines.length) - 1]);
  ranges = ranges.flatMap(([start, end]) => {
    const pieces = [];
    for (let from = start; from <= end; from += MAX_SEGMENT_LINES) {
      pieces.push([from, Math.min(end, from + MAX_SEGMENT_LINES - 1)]);
    }
    return pieces;
  });
  const merged = [];
  for (const range of ranges) {
    const previous = merged.at(-1);
    if (previous && range[1] - range[0] + 1 < MIN_SEGMENT_LINES) {
      previous[1] = range[1];
    } else {
      merged.push([...range]);
    }
  }
  while (merged.length > MAX_SEGMENTS) {
    for (let index = 0; index + 1 < merged.length; index++) {
      merged[index][1] = merged[index + 1][1];
      merged.splice(index + 1, 1);
    }
  }
  return merged.map(([start, end], index) => ({
    id: `s${index + 1}`,
    start: firstLine + start,
    end: firstLine + end,
    label: labelFor(lines.slice(start, end + 1)),
  }));
};

/** First non-blank, non-comment line of a segment, as a short human label. */
const labelFor = (lines) => {
  const line =
    lines.find((text) => text.trim() && !/^\s*(\/\/|\/\*|\*)/.test(text)) ?? lines.find((text) => text.trim()) ?? '';
  const trimmed = line.trim();
  return trimmed.length > 80 ? `${trimmed.slice(0, 77)}...` : trimmed;
};

/**
 * Cut lines into overlapping windows of at most `maxChars` characters each, balanced in size, so
 * a file too large for one state is reviewed whole without a sliver of a last window that re-asks
 * every question for a few lines.
 *
 * @returns {Array<{ start: number, lines: string[] }>} `start` is the 1-based first line.
 */
export const windowLines = (lines, maxChars, overlap = 10) => {
  const cost = (line) => line.length + 8;
  const total = lines.reduce((sum, line) => sum + cost(line), 0);
  const count = Math.max(1, Math.ceil(total / maxChars));
  const target = Math.min(maxChars, Math.ceil(total / count) + overlap * 80);
  const windows = [];
  let start = 0;
  while (start < lines.length) {
    let size = 0;
    let end = start;
    while (end < lines.length && (end === start || size + cost(lines[end]) <= target)) {
      size += cost(lines[end]);
      end++;
    }
    windows.push({ start: start + 1, lines: lines.slice(start, end) });
    if (end >= lines.length) {
      break;
    }
    start = Math.max(start + 1, end - overlap);
  }
  return windows;
};

/** Names a module exports through declarations, in source order. */
export const exportedNames = (text) =>
  text
    .split(/\r?\n/)
    .map((line) => line.match(EXPORT_NAME_RE)?.[1])
    .filter(Boolean);

/**
 * The export declarations of a module cut to their first line: a signature view that shows a
 * module's surface without its bodies.
 */
export const exportSignatures = (text) =>
  text
    .split(/\r?\n/)
    .filter((line) => EXPORT_NAME_RE.test(line) || /^export\s+(?:\*|\{)/.test(line))
    .map((line) => (line.length > 160 ? `${line.slice(0, 157)}...` : line));

/** Split an identifier into lower-case words: `makeSpaceIndex` → `make`, `space`, `index`. */
export const identifierWords = (name) =>
  name
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .split(/[^A-Za-z0-9]+/)
    .map((word) => word.toLowerCase())
    .filter((word) => word.length > 2);

/** Truncate text to `maxChars`, cutting at a line boundary and saying how much was dropped. */
export const truncateText = (text, maxChars) => {
  if (text.length <= maxChars) {
    return text;
  }
  const cut = text.lastIndexOf('\n', maxChars);
  const kept = text.slice(0, cut > 0 ? cut : maxChars);
  const dropped = text.slice(kept.length).split('\n').length - 1;
  return `${kept}\n... [${dropped} more lines not shown]`;
};
