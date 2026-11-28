//
// Copyright 2026 DXOS.org
//

const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'any',
  'are',
  'as',
  'at',
  'be',
  'by',
  'can',
  'could',
  'did',
  'do',
  'does',
  'for',
  'from',
  'how',
  'i',
  'if',
  'in',
  'into',
  'is',
  'it',
  'its',
  'long',
  'many',
  'me',
  'much',
  'my',
  'not',
  'of',
  'on',
  'or',
  'other',
  'our',
  'per',
  'that',
  'the',
  'them',
  'there',
  'they',
  'this',
  'to',
  'up',
  'us',
  'was',
  'we',
  'what',
  'when',
  'which',
  'who',
  'why',
  'with',
  'you',
  'your',
]);

/** A word without its plural `s`, so "alarms" and "alarm" are one term. */
const singular = (word: string): string =>
  word.length > 3 && word.endsWith('s') && !word.endsWith('ss') ? word.slice(0, -1) : word;

/** The content words of a text: lowercased, split on non-alphanumerics, stop words dropped, plurals folded. */
export const terms = (text: string): ReadonlySet<string> =>
  new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((word) => word.length > 0 && !STOP_WORDS.has(word))
      .map(singular),
  );

/** A product a message can be about. */
export type Topic = {
  readonly name: string;
  /** Other spellings; a plural `s` is matched without listing it. */
  readonly aliases?: readonly string[];
};

/** The Workers products the demo recognises. */
export const TOPICS: readonly Topic[] = [
  { name: 'Workers', aliases: ['Worker'] },
  { name: 'Durable Objects', aliases: ['Durable Object'] },
  { name: 'KV' },
  { name: 'Cron Triggers', aliases: ['Cron Trigger', 'cron'] },
  { name: 'Secrets', aliases: ['secret'] },
  { name: 'R2' },
  { name: 'D1' },
  { name: 'Queues', aliases: ['Queue'] },
  { name: 'Hyperdrive' },
  { name: 'Logpush' },
  { name: 'Wrangler' },
];

const escape = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const matchers = TOPICS.map((topic) => ({
  name: topic.name,
  pattern: new RegExp(`\\b(?:${[topic.name, ...(topic.aliases ?? [])].map(escape).join('|')})s?\\b`, 'i'),
}));

/** The names of the topics a text mentions, in the order of {@link TOPICS}. */
export const topicsOf = (text: string): string[] =>
  matchers.filter(({ pattern }) => pattern.test(text)).map(({ name }) => name);
