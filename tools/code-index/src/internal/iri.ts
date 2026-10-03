//
// Copyright 2026 DXOS.org
//

/**
 * The one place an IRI component is escaped. Only characters an IRI cannot carry literally, or that
 * would move the boundary between path, query and fragment, are percent-encoded: `/`, `@` and `:`
 * stay as written, so `deus/module/@dxos/compute/Operation#make` reads like the import it names.
 */

// `%` itself, the query and fragment delimiters, and the characters RFC 3987 excludes from an IRI —
// `[` and `]` among them, which only an IP-literal host may hold (`src/[id]/page.ts`).
const RESERVED = new Set('%#?<>"{}|\\^`[]');

/** Whitespace and the C0/C1 controls are excluded too. */
const mustEscape = (char: string): boolean => {
  const code = char.codePointAt(0) ?? 0;
  return RESERVED.has(char) || /\s/u.test(char) || code < 0x20 || (code >= 0x7f && code <= 0x9f);
};

const escapeReserved = (value: string): string =>
  Array.from(value, (char) => (mustEscape(char) ? encodeURIComponent(char) : char)).join('');

/**
 * Escape a slash-separated path (a file path, package name or module specifier). Windows separators
 * become `/`, and a segment that is exactly `.` or `..` is escaped because IRI resolution would
 * otherwise collapse it.
 */
export const escapePath = (path: string): string =>
  path
    .replaceAll('\\', '/')
    .split('/')
    .map((segment) => (segment === '.' || segment === '..' ? segment.replaceAll('.', '%2E') : escapeReserved(segment)))
    .join('/');

/** Escape a fragment; `#` is escaped so a private member `#field` cannot open a second fragment. */
export const escapeFragment = (fragment: string): string => escapeReserved(fragment);
