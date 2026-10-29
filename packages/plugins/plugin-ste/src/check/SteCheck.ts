//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { WORD_LIST_ENTRIES } from './word-list.ts';

/** Text type; procedural text has a shorter sentence limit than descriptive text. */
export type Mode = 'procedural' | 'descriptive' | 'mixed';

/** One rule violation; `rule` is the ASD-STE100 rule number. */
export type Finding = {
  location: string;
  rule: string;
  message: string;
};

export type Report = {
  errors: Finding[];
  warnings: Finding[];
  /** Words not in the approved word list, most frequent first; each must be a technical name or technical verb. */
  unknownWords: string[];
};

export type CheckOptions = {
  mode?: Mode;
  /** Compare words with the approved word list (default true). */
  vocabulary?: boolean;
};

// Rule 3.5: the only approved "-ing" words in the STE dictionary.
const ING_APPROVED = new Set([
  'mating',
  'missing',
  'remaining',
  'lighting',
  'opening',
  'routing',
  'servicing',
  'during',
]);

// Words that end in "ing" where "ing" is not a verb suffix.
const ING_NOT_SUFFIX = new Set([
  'ring',
  'spring',
  'string',
  'king',
  'thing',
  'wing',
  'sing',
  'bring',
  'sting',
  'swing',
  'nothing',
  'anything',
  'everything',
  'something',
  'bearing',
  'ceiling',
  'morning',
  'evening',
]);

// Rule 3.2: the approved helping verbs are only CAN, MUST and WILL.
const BANNED_MODALS = new Set(['should', 'would', 'may', 'might', 'shall', 'ought']);

const CONTRACTION = /\b\w+n't\b|\b\w+'(?:re|ll|ve|m)\b|\b(?:it|that|there|what|let|who|here|he|she)'s\b/i;

const HAVE_PARTICIPLE =
  /\b(?:has|have|had)\s+(?:been|\w+ed|done|made|gone|put|set|cut|kept|held|taken|given|found|left|lost|meant|sent|shown|told|built|become|begun|broken|brought|come|fallen|felt|got|gotten|grown|known|read|run|seen|spoken|thrown|worn|written)\b/i;

const COMPLEX_PASSIVE =
  /\b(?:can|will|must|could|would|should|may|might|shall)\s+(?:not\s+)?be\s+\w+(?:ed|en)\b|\b(?:is|are|was|were)\s+to\s+be\s+\w+(?:ed|en)\b/i;

const PASSIVE_BY = /\b(?:is|are|was|were|be|been|being)\s+(?:\w+\s+)?\w+(?:ed|en)\s+by\b/i;

const BE_ING = /\b(?:is|are|was|were|be|been|am)\s+\w+ing\b/i;

const SENT_SPLIT = /(?<=[.!?])\s+/;
const WORDISH = /[A-Za-z0-9'&/\u2019-]+/g;
const FENCE = /^\s{0,3}(`{3,}|~{3,})/;
const BULLET = /^\s*(?:[-*+]|\d+\.)\s/;

const LIMITS: Record<Mode, number> = { procedural: 20, descriptive: 25, mixed: 25 };

const isUpper = (word: string): boolean => /[A-Za-z]/.test(word) && word === word.toUpperCase();

const hasWord = (text: string): boolean => /[A-Za-z0-9'&/\u2019-]/.test(text);

/** Parses `WORD (pos) [forms]` entries into the set of approved lowercase word forms. */
export const parseWordList = (entries: readonly string[]): Set<string> => {
  const approved = new Set<string>();
  const lineRe = /^([A-Z][A-Z' -]*[A-Z])\s+\((\w+(?:, \w+)*)\)(?:\s+\[(.*)\])?/;
  for (const line of entries) {
    const match = lineRe.exec(line);
    if (!match) {
      continue;
    }
    const [, head, partsOfSpeech, forms] = match;
    for (const word of head.split(/\s+/)) {
      approved.add(word.toLowerCase());
    }
    if (forms) {
      for (const form of forms.split(',')) {
        for (const word of form.trim().split(/\s+/)) {
          approved.add(word.toLowerCase());
        }
      }
    }
    // The plural of an approved countable noun is also approved.
    if (partsOfSpeech.split(', ').includes('n')) {
      const word = head.toLowerCase();
      approved.add(`${word}s`);
      if (/(?:s|x|ch|sh)$/.test(word)) {
        approved.add(`${word}es`);
      }
      if (word.endsWith('y') && word.length >= 2 && !'aeiou'.includes(word[word.length - 2])) {
        approved.add(`${word.slice(0, -1)}ies`);
      }
    }
  }
  return approved;
};

let approvedWords: Set<string> | undefined;
const getApprovedWords = (): Set<string> => (approvedWords ??= parseWordList(WORD_LIST_ENTRIES));

/** Removes fenced code blocks; a fence closes only on the same character with at least the same length. */
const stripFencedCode = (text: string): string => {
  const out: string[] = [];
  let opener: string | undefined;
  for (const line of text.split('\n')) {
    const match = FENCE.exec(line);
    if (opener === undefined) {
      if (match) {
        opener = match[1];
        out.push('');
      } else {
        out.push(line);
      }
    } else if (
      match &&
      match[1][0] === opener[0] &&
      match[1].length >= opener.length &&
      line.slice(match[0].length).trim() === ''
    ) {
      opener = undefined;
      out.push('');
    }
  }
  return out.join('\n');
};

/** Removes the parts of Markdown that the STE rules do not control (code, URLs, quotes). */
const stripMarkdown = (text: string): string => {
  let result = text.replace(/^---\n[\s\S]*?\n---\n/, '');
  result = stripFencedCode(result);
  result = result.replace(/`[^`\n]+`/g, ' CODE ');
  result = result.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');
  result = result.replace(/https?:\/\/\S+/g, ' URL ');
  result = result.replace(/^>.*$/gm, ' ');
  // Rule 8.6: quoted text counts as one word and is not controlled.
  result = result.replace(/"[^"\n]*"|\u201C[^\u201D\n]*\u201D/g, ' QUOTED ');
  return result;
};

/** Counts words per section 8: a number, an identifier, a hyphenated group and a parenthesis each count as one. */
export const countWords = (sentence: string): number => {
  const text = sentence.replace(/\([^)]*\)/g, ' PAREN ').replace(/\*\*|\*|__|_|#+/g, ' ');
  return text.match(WORDISH)?.length ?? 0;
};

const splitSentences = (block: string): string[] =>
  block
    .split(SENT_SPLIT)
    .map((part) => part.trim())
    .filter((part) => part.length > 0 && hasWord(part));

class Collector {
  readonly errors: Finding[] = [];
  readonly warnings: Finding[] = [];
  readonly unknown = new Map<string, number>();

  error(location: string, rule: string, message: string): void {
    this.errors.push({ location, rule, message });
  }

  warn(location: string, rule: string, message: string): void {
    this.warnings.push({ location, rule, message });
  }
}

const checkSentence = (sentence: string, mode: Mode, collector: Collector, location: string): void => {
  const limit = LIMITS[mode];
  const count = countWords(sentence);
  const head = sentence.length <= 60 ? sentence : `${sentence.slice(0, 57)}...`;
  if (count > 25) {
    collector.error(location, '5.1/6.3', `sentence has ${count} words (max ${limit}): "${head}"`);
  } else if (count > 20) {
    if (mode === 'procedural') {
      collector.error(location, '5.1', `sentence has ${count} words (max 20): "${head}"`);
    } else if (mode === 'mixed') {
      collector.warn(location, '5.1', `sentence has ${count} words (max 20 if procedural): "${head}"`);
    }
  }

  if (sentence.includes(';')) {
    collector.error(location, '8.1', `semicolon found: "${head}". Write two sentences.`);
  }

  const contraction = CONTRACTION.exec(sentence);
  if (contraction) {
    collector.error(location, '4.2', `contraction "${contraction[0]}": write the full words.`);
  }

  const haveParticiple = HAVE_PARTICIPLE.exec(sentence);
  if (haveParticiple) {
    collector.error(location, '3.4', `helping verb structure "${haveParticiple[0]}": use the simple past tense.`);
  }

  const complexPassive = COMPLEX_PASSIVE.exec(sentence);
  if (complexPassive) {
    collector.error(location, '3.4', `complex passive "${complexPassive[0]}": make the sentence active.`);
  }

  const passiveBy = PASSIVE_BY.exec(sentence);
  if (passiveBy) {
    collector.error(location, '3.6', `passive voice "${passiveBy[0]}": make the agent the subject.`);
  }

  const beIng = BE_ING.exec(sentence);
  if (beIng) {
    const tail = beIng[0].split(/\s+/).at(-1)?.toLowerCase() ?? '';
    if (!ING_APPROVED.has(tail)) {
      collector.error(location, '3.5', `progressive form "${beIng[0]}": use a simple tense.`);
    }
  }

  for (const word of sentence.match(/[A-Za-z-]+/g) ?? []) {
    const lower = word.toLowerCase();
    if (BANNED_MODALS.has(lower)) {
      collector.error(
        location,
        '3.2',
        `"${word}" is not approved. Use "must" (requirement), "can" (possibility), "will" (future), or remove it.`,
      );
    } else if (lower === 'could') {
      collector.warn(location, '3.2', '"could" is approved only as the past tense of "can".');
    } else if (lower.endsWith('ing') && lower.length > 4 && !isUpper(word)) {
      if (!ING_APPROVED.has(lower) && !ING_NOT_SUFFIX.has(lower)) {
        collector.warn(location, '3.5', `"${word}": an "-ing" form is permitted only in a technical name.`);
      }
    }
  }
};

const checkVocabulary = (text: string, collector: Collector, approved: Set<string>): void => {
  for (const word of text.match(/[A-Za-z]+(?:-[A-Za-z]+)*/g) ?? []) {
    // Acronyms and identifiers are technical names.
    if (isUpper(word) || /[A-Z]/.test(word.slice(1))) {
      continue;
    }
    const lower = word.toLowerCase();
    if (approved.has(lower) || ING_APPROVED.has(lower) || lower.length <= 1) {
      continue;
    }
    if (
      lower
        .split('-')
        .filter((part) => part.length > 0)
        .every((part) => approved.has(part))
    ) {
      continue;
    }
    collector.unknown.set(lower, (collector.unknown.get(lower) ?? 0) + 1);
  }
};

/**
 * Checks text or Markdown against the ASD-STE100 writing rules that a program can detect.
 * Code blocks, inline code, URLs, quotes and frontmatter are not checked.
 * The check cannot make sure that each word has its approved meaning.
 */
export const check = (text: string, { mode = 'mixed', vocabulary = true }: CheckOptions = {}): Report => {
  const collector = new Collector();
  const approved = vocabulary ? getApprovedWords() : undefined;
  const paragraphs = stripMarkdown(text).split(/\n\s*\n/);
  paragraphs.forEach((paragraph, index) => {
    const trimmed = paragraph.trim();
    if (!trimmed || !hasWord(trimmed)) {
      return;
    }

    // Rule 8.6: a heading or a table row is a title or quoted text.
    const lines = trimmed.split('\n').filter((line) => !/^\s*[#|]/.test(line));
    if (lines.length === 0) {
      return;
    }

    // Rule 8.4: a list item counts as its own sentence.
    for (const line of lines.filter((line) => BULLET.test(line))) {
      const item = line.replace(/^\s*(?:[-*+]|\d+\.)\s+/, '');
      for (const sentence of splitSentences(item)) {
        checkSentence(sentence, mode, collector, 'list');
      }
      if (approved) {
        checkVocabulary(item, collector, approved);
      }
    }

    const prose = lines.filter((line) => !BULLET.test(line));
    if (prose.length > 0) {
      const location = `paragraph ${index + 1}`;
      const block = prose.join('\n');
      const sentences = splitSentences(block);
      if (sentences.length > 6) {
        collector.error(location, '6.6', `paragraph has ${sentences.length} sentences (max 6).`);
      }
      for (const sentence of sentences) {
        checkSentence(sentence, mode, collector, location);
      }
      if (approved) {
        checkVocabulary(block, collector, approved);
      }
    }
  });

  const unknownWords = [...collector.unknown.entries()]
    .sort(([, left], [, right]) => right - left)
    .map(([word]) => word);
  return { errors: collector.errors, warnings: collector.warnings, unknownWords };
};
