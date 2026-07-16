//
// Copyright 2026 DXOS.org
//

/** A character span within a field value, for highlighting. */
export type MatchSpan = { start: number; end: number };

/** Case-insensitive, non-overlapping occurrences of `query` within `value`. */
export const computeMatchSpans = (value: string, query: string): MatchSpan[] => {
  const spans: MatchSpan[] = [];
  const needle = query.trim().toLowerCase();
  if (needle.length === 0) {
    return spans;
  }
  const haystack = value.toLowerCase();
  let from = 0;
  for (;;) {
    const index = haystack.indexOf(needle, from);
    if (index === -1) {
      break;
    }
    spans.push({ start: index, end: index + needle.length });
    from = index + needle.length;
  }
  return spans;
};

const DEFAULT_SNIPPET_MAX_LENGTH = 160;

/** Return the first `maxLength` characters of `text`, with a trailing ellipsis if truncated. */
const headSnippet = (text: string, maxLength: number): string =>
  text.length > maxLength ? `${text.slice(0, maxLength)}…` : text;

/**
 * Return a snippet window of `text` centred on the first match of `query`, with ellipses;
 * falls back to the head of `text` when there is no match.
 */
export const buildSnippet = (text: string, query: string, options?: { maxLength?: number }): string => {
  const maxLength = options?.maxLength ?? DEFAULT_SNIPPET_MAX_LENGTH;
  const normalized = text.replace(/\s+/g, ' ').trim();
  const needle = query.trim().toLowerCase();
  if (needle.length === 0) {
    return headSnippet(normalized, maxLength);
  }

  const matchStart = normalized.toLowerCase().indexOf(needle);
  if (matchStart === -1) {
    return headSnippet(normalized, maxLength);
  }
  const matchEnd = matchStart + needle.length;

  // Centre the window on the match, then clamp to the text bounds.
  const matchCenter = (matchStart + matchEnd) / 2;
  let windowStart = Math.round(matchCenter - maxLength / 2);
  let windowEnd = windowStart + maxLength;
  if (windowStart < 0) {
    windowEnd -= windowStart;
    windowStart = 0;
  }
  if (windowEnd > normalized.length) {
    windowStart -= windowEnd - normalized.length;
    windowEnd = normalized.length;
    windowStart = Math.max(0, windowStart);
  }

  // Never split the matched term, even if that makes the window wider than `maxLength`.
  windowStart = Math.min(windowStart, matchStart);
  windowEnd = Math.max(windowEnd, matchEnd);

  const prefix = windowStart > 0 ? '…' : '';
  const suffix = windowEnd < normalized.length ? '…' : '';
  return `${prefix}${normalized.slice(windowStart, windowEnd)}${suffix}`;
};
