//
// Copyright 2026 DXOS.org
//

/** A run of a plain-text string: bare text, or text that is also a URL. */
export type TextRun = {
  text: string;
  /** Present when the run is a link; equal to `text`. */
  href?: string;
};

/**
 * Only absolute http(s) URLs. A schemeless host (`dxos.org`) is not distinguishable from prose with
 * a period in it, and anything else — `mailto:`, `javascript:` — is not something a title should be
 * able to make clickable.
 */
const URL_PATTERN = /https?:\/\/[^\s<>]+/g;

/** Sentence punctuation that follows a URL far more often than it belongs to one. */
const TRAILING_PUNCTUATION = /[.,;:!?'"]+$/;

/**
 * Trim the punctuation a URL picked up from the sentence around it. A closing bracket is only the
 * sentence's when the URL carries no matching opener, which is what keeps a wiki-style
 * `…/Foo_(bar)` intact.
 */
const trimUrl = (url: string): string => {
  let trimmed = url.replace(TRAILING_PUNCTUATION, '');
  while (trimmed.length > 0) {
    const last = trimmed.slice(-1);
    const opener = last === ')' ? '(' : last === ']' ? '[' : undefined;
    if (!opener) {
      break;
    }
    const opened = trimmed.split(opener).length - 1;
    const closed = trimmed.split(last).length - 1;
    if (opened >= closed) {
      break;
    }
    trimmed = trimmed.slice(0, -1).replace(TRAILING_PUNCTUATION, '');
  }
  return trimmed;
};

/**
 * Split plain text into text and link runs.
 *
 * A task's title is a string, not markdown, so a URL pasted into it has no syntax that would make
 * it a link — the reader sees the address and cannot follow it. Splitting the string is what lets
 * the row render the address as an anchor; a description takes the markdown path instead.
 *
 * Returns a single text run for a string with no URL in it, so a caller never special-cases the
 * common case.
 */
export const linkifyText = (text: string): TextRun[] => {
  const runs: TextRun[] = [];
  let index = 0;
  for (const match of text.matchAll(URL_PATTERN)) {
    const start = match.index;
    const url = trimUrl(match[0]);
    if (url.length === 0) {
      continue;
    }
    if (start > index) {
      runs.push({ text: text.slice(index, start) });
    }
    runs.push({ text: url, href: url });
    index = start + url.length;
  }
  if (index < text.length) {
    runs.push({ text: text.slice(index) });
  }
  return runs;
};
