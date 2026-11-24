//
// Copyright 2026 DXOS.org
//

import { slug, tokenize } from './text.ts';
import { type MemoryType } from './types.ts';

/** One item the extraction + classification stages produce, before deduplication. */
export type Extracted = {
  type: MemoryType;
  /** Supersession key: a later fact or instruction with the same key replaces the earlier one. */
  topicKey: string;
  summary: string;
  content: string;
  keywords: string[];
  searchQueries: string[];
};

type Rule = {
  pattern: RegExp;
  build: (match: RegExpMatchArray, context: { subject: string; timestamp: Date }) => Omit<Extracted, 'keywords'>;
};

const day = (date: Date, offset = 0) => new Date(date.getTime() + offset * 86_400_000).toISOString().slice(0, 10);

const resolveRelative = (text: string, timestamp: Date) =>
  text
    .replace(/\byesterday\b/i, `on ${day(timestamp, -1)}`)
    .replace(/\btoday\b/i, `on ${day(timestamp)}`)
    .replace(/\bon friday\b/i, 'on Friday');

const trimEnd = (text: string) => text.replace(/[.!?\s]+$/, '');

// Deterministic stand-in for the extraction and classification LLM calls: the real service prompts a model
// for the same fields (type, topic key, keywords, search queries); rules keep the story reproducible offline.
const RULES: Rule[] = [
  {
    pattern: /^(?:hi,?\s*)?(?:i'?m|i am|my name is)\s+([A-Z][a-z]+)/i,
    build: ([, name]) => ({
      type: 'fact',
      topicKey: 'user.name',
      summary: `User's name is ${name}`,
      content: `The user introduced themselves as ${name}.`,
      searchQueries: ['what is the user called', "user's name"],
    }),
  },
  {
    pattern: /^i work (?:on|at|for)\s+(.+)$/i,
    build: ([, place], { subject }) => ({
      type: 'fact',
      topicKey: 'user.work',
      summary: `${subject} works on ${trimEnd(place)}`,
      content: `${subject} works on ${trimEnd(place)}.`,
      searchQueries: ['where does the user work', 'which team is the user on'],
    }),
  },
  {
    pattern: /^(?:update:\s*)?i (?:now )?prefer\s+(\w+)\s+for\s+(.+?)(?:\s+now)?[.!]?$/i,
    build: ([, choice, area], { subject }) => ({
      type: 'fact',
      topicKey: `preference.${slug(area)}`,
      summary: `${subject} prefers ${choice} for ${trimEnd(area)}`,
      content: `${subject} prefers ${choice} for ${trimEnd(area)}.`,
      searchQueries: [`which language for ${trimEnd(area)}`, `${subject} preference ${trimEnd(area)}`],
    }),
  },
  {
    pattern: /^we\s+(deployed|shipped|released|rolled back|decided|migrated)\s+(.+)$/i,
    build: ([, verb, rest], { timestamp }) => {
      const text = resolveRelative(`${verb} ${trimEnd(rest)}`, timestamp);
      return {
        type: 'event',
        // Events accumulate rather than conflict, so each gets its own key.
        topicKey: `event.${slug(rest)}.${day(timestamp)}`,
        summary: text.charAt(0).toUpperCase() + text.slice(1),
        content: `The team ${text}.`,
        searchQueries: [`what happened with ${slug(rest).replace(/-/g, ' ')}`],
      };
    },
  },
  {
    pattern: /^(always|never)\s+(.+)$/i,
    build: ([, modal, rest]) => {
      const tail = trimEnd(rest);
      const [action, anchor = tail] = tail.split(/\s+(?:before|after|when)\s+/i);
      return {
        type: 'instruction',
        // Keyed by trigger and action: two different rules for "before deploying" must not supersede each other.
        topicKey: `instruction.${slug(anchor)}.${slug(action)}`,
        summary: `${modal.charAt(0).toUpperCase() + modal.slice(1)} ${tail}`,
        content: `Convention: ${modal.toLowerCase()} ${tail}.`,
        searchQueries: [`what to do ${anchor}`],
      };
    },
  },
  {
    pattern: /^(?:remind me to|i need to|todo:?)\s+(.+)$/i,
    build: ([, rest], { timestamp }) => ({
      type: 'task',
      topicKey: `task.${slug(rest)}`,
      summary: `Task: ${resolveRelative(trimEnd(rest), timestamp)}`,
      content: `The user asked to be reminded to ${resolveRelative(trimEnd(rest), timestamp)}.`,
      searchQueries: ['open tasks', 'reminders'],
    }),
  },
];

export const splitSentences = (text: string): string[] =>
  text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

/** Extraction + classification for one sentence; `undefined` for chit-chat that holds nothing durable. */
export const extractSentence = (sentence: string, context: { subject: string; timestamp: Date }) => {
  for (const rule of RULES) {
    const match = sentence.match(rule.pattern);
    if (match) {
      const item = rule.build(match, context);
      return {
        ...item,
        keywords: [
          ...new Set(
            tokenize(`${item.summary} ${item.topicKey.replace(/[.-]/g, ' ')}`).filter((word) => !/^\d+$/.test(word)),
          ),
        ],
      };
    }
  }
  return undefined;
};

/** The name a user gave, so later items can say "Dana prefers" rather than "the user prefers". */
export const subjectOf = (sentences: string[], fallback: string) => {
  for (const sentence of sentences) {
    const match = sentence.match(RULES[0].pattern);
    if (match) {
      return match[1];
    }
  }
  return fallback;
};
