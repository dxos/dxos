//
// Copyright 2026 DXOS.org
//

// Leading auxiliary / copula / article words dropped from a predicate so "is a man" keys as "man"
// and "is working at" keys the same as "works at".
const LEADING_NOISE = new Set([
  'is',
  'are',
  'was',
  'were',
  'be',
  'been',
  'being',
  'am',
  'has',
  'have',
  'had',
  'does',
  'do',
  'did',
  'can',
  'could',
  'will',
  'would',
  'shall',
  'should',
  'may',
  'might',
  'must',
  'a',
  'an',
  'the',
  'to',
]);

/** Light inflectional stem of a single word (consistency over linguistic correctness). */
const stem = (word: string): string => {
  if (word.length > 4 && word.endsWith('ing')) {
    return word.slice(0, -3);
  }
  if (word.length > 3 && word.endsWith('ed')) {
    return word.slice(0, -2);
  }
  if (word.length > 4 && word.endsWith('ies')) {
    return `${word.slice(0, -3)}y`;
  }
  if (word.length > 3 && word.endsWith('s') && !word.endsWith('ss')) {
    return word.slice(0, -1);
  }
  return word;
};

/**
 * Normalize a predicate to a relation key for matching: lowercase, collapse whitespace, drop leading
 * auxiliary/copula/article words, and light-stem the head verb. Inflection / case / auxiliary variants
 * collapse (e.g. `Works at` / `is working at` / `worked at` → `work at`). True synonyms (`at` vs `for`,
 * `works` vs `employed by`) are NOT merged — that needs a controlled vocabulary (deferred). Idempotent.
 */
export const normalizePredicate = (predicate: string): string => {
  const tokens = predicate
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter((token) => token.length > 0);
  while (tokens.length > 1 && LEADING_NOISE.has(tokens[0])) {
    tokens.shift();
  }
  if (tokens.length > 0) {
    tokens[0] = stem(tokens[0]);
  }
  return tokens.join(' ');
};
