//
// Copyright 2026 DXOS.org
//

const RESET = '\x1b[0m';

// ANSI slots rather than colors: the terminal theme maps each slot onto a design system hue.
const KEY = '\x1b[36m';
const STRING = '\x1b[32m';
const NUMBER = '\x1b[33m';
const BOOLEAN = '\x1b[35m';
const NULL = '\x1b[2m';

// Strings first, so a colon, digit or keyword inside one is never read as its own token.
const TOKEN = /("(?:[^"\\]|\\.)*")(\s*:)?|\b(?:true|false)\b|\bnull\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g;

/**
 * The value `text` holds when it is a JSON object or array, else undefined. A bare scalar is valid
 * JSON too, but reads as ordinary output, so only structured data is treated as JSON.
 */
export const parseJson = (text: string): unknown => {
  const trimmed = text.trim();
  if (!/^[[{]/.test(trimmed)) {
    return undefined;
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    return undefined;
  }
};

/** Indented JSON with ANSI colors per token kind; stripped of its escapes it is `JSON.stringify(value, null, 2)`. */
export const highlightJson = (value: unknown): string =>
  (JSON.stringify(value, null, 2) ?? String(value)).replace(TOKEN, (match, string?: string, colon?: string) => {
    if (string !== undefined) {
      return colon !== undefined ? `${KEY}${string}${RESET}${colon}` : `${STRING}${string}${RESET}`;
    }
    if (match === 'true' || match === 'false') {
      return `${BOOLEAN}${match}${RESET}`;
    }
    if (match === 'null') {
      return `${NULL}${match}${RESET}`;
    }
    return `${NUMBER}${match}${RESET}`;
  });
