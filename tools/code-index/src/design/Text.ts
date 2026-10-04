//
// Copyright 2026 DXOS.org
//
// @import-as-namespace
//

/**
 * Prompt-to-code text matching, shared by the deterministic explorer (seeding) and the baseline
 * scorer. Identifiers are split the way people write about them — `AgentService` matches "agent
 * service" and `agent-runtime` matches "agent runtime" — so a prompt in prose can find code.
 */

const STOPWORDS = new Set(
  (
    'a an and are as at be by does do for from how in into is it its of on or that the their them this to ' +
    'what when where which who why with wire wires wired work works show me explain between through via ' +
    'there these those does each other all any can about'
  ).split(' '),
);

const split = (text: string): string[] =>
  text
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 1);

/** Lower-cased word stems: identifiers split at case and punctuation, a trailing plural `s` dropped. */
export const words = (text: string): string[] => split(text).map(stem);

const stem = (word: string): string =>
  word.length > 4 && word.endsWith('ies')
    ? `${word.slice(0, -3)}y`
    : word.length > 3 && word.endsWith('s') && !word.endsWith('ss')
      ? word.slice(0, -1)
      : word;

export type Query = {
  /** Content words of the prompt. */
  readonly terms: readonly string[];
  /** Adjacent pairs joined, so "agent runtime" also matches the package `agent-runtime`. */
  readonly phrases: readonly string[];
};

export const query = (prompt: string): Query => {
  // Stopwords are dropped before stemming, which would otherwise turn "does" into a content word.
  const terms = split(prompt)
    .filter((word) => !STOPWORDS.has(word))
    .map(stem);
  const phrases = terms.slice(1).map((term, index) => `${terms[index]} ${term}`);
  return { terms: [...new Set(terms)], phrases: [...new Set(phrases)] };
};

/**
 * How well a piece of text matches the query, in [0, 1]: the share of terms it contains, with a
 * bonus per phrase it contains in order. Weighting phrases is what lets `agent-runtime` outrank
 * every file that merely mentions an agent.
 */
export const match = (target: Query, text: string): number => {
  if (target.terms.length === 0) {
    return 0;
  }
  const tokens = words(text);
  const present = new Set(tokens);
  const joined = ` ${tokens.join(' ')} `;
  const hits = target.terms.filter((term) => present.has(term)).length;
  const phraseHits = target.phrases.filter((phrase) => joined.includes(` ${phrase} `)).length;
  const phraseWeight = target.phrases.length > 0 ? phraseHits / target.phrases.length : 0;
  return Math.min(1, (hits / target.terms.length) * 0.7 + phraseWeight * 0.3 + (phraseHits > 0 ? 0.1 : 0));
};
