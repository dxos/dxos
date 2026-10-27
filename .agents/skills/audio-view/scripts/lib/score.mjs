//
// Copyright 2026 DXOS.org
//

// Transcript scoring against a reference: word error rate and recall of named terms.

const NUMBER_WORDS = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
  'sixteen',
  'seventeen',
  'eighteen',
  'nineteen',
  'twenty',
];

/**
 * Lowercase words with punctuation stripped, and 0–20 spelled out since a model may write "3." for "three";
 * "data base" and "database" stay different words on purpose.
 */
export const normalizeWords = (text) =>
  text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}'\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => (/^\d+$/.test(word) ? (NUMBER_WORDS[Number(word)] ?? word) : word));

/** Word error rate: (substitutions + deletions + insertions) / reference words, via edit distance over words. */
export const wordErrorRate = (reference, hypothesis) => {
  const expected = normalizeWords(reference);
  const actual = normalizeWords(hypothesis);
  if (expected.length === 0) {
    return actual.length === 0 ? 0 : 1;
  }
  let previous = Array.from({ length: actual.length + 1 }, (_, index) => index);
  for (let row = 1; row <= expected.length; row++) {
    const current = [row];
    for (let column = 1; column <= actual.length; column++) {
      const substitution = previous[column - 1] + (expected[row - 1] === actual[column - 1] ? 0 : 1);
      current.push(Math.min(substitution, previous[column] + 1, current[column - 1] + 1));
    }
    previous = current;
  }
  return previous[actual.length] / expected.length;
};

/** Which of `terms` appear (as whole word sequences) in the hypothesis, among those the reference contains. */
export const termRecall = (reference, hypothesis, terms) => {
  const contains = (text, term) =>
    ` ${normalizeWords(text).join(' ')} `.includes(` ${normalizeWords(term).join(' ')} `);
  const expected = terms.filter((term) => contains(reference, term));
  const found = expected.filter((term) => contains(hypothesis, term));
  return { expected, found, missed: expected.filter((term) => !found.includes(term)) };
};
