//
// Copyright 2026 DXOS.org
//

import type * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { type ContentBlock, type Person } from '@dxos/types';

export type Clock = SampleSpace.Clock['Service'];

export const textBlock = (text: string): ContentBlock.Text => ({ _tag: 'text', text });

/** RFC 5322 address for a person, the form synced mail stores in `properties.to` and `cc`. */
export const address = (person: Person.Person): string => `${person.fullName} <${person.emails?.[0]?.value}>`;

const normalizeSubject = (subject: string): string => subject.replace(/^(\s*(re|fwd?):\s*)+/i, '').trim();

/** Replies share their root's thread: the id is a slug of the subject with any "Re:" stripped. */
export const threadIdFor = (subject: string): string =>
  `thread-${
    normalizeSubject(subject)
      .normalize('NFKD')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase() || 'thread'
  }`;

/** Mulberry32, seeded, so generated content is identical on every build. */
export const makeRandom = (seed: number) => {
  let state = seed >>> 0;
  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };

  return {
    next,
    int: (min: number, max: number): number => min + Math.floor(next() * (max - min + 1)),
    pick: <T>(items: readonly T[]): T => items[Math.floor(next() * items.length)],
  };
};

/** ISO timestamp `offset` days from the reference date (negative is past) at `hour`:`minute` UTC. */
export const at = (clock: Clock, offset: number, hour: number, minute = 0): string =>
  new Date(Date.parse(clock.daysFromNow(offset, hour)) + minute * 60_000).toISOString();

/** `YYYY-MM-DD` of the day `offset` days from the reference date, the form all-day events store. */
export const dateOnly = (clock: Clock, offset: number): string => clock.daysFromNow(offset, 0).slice(0, 10);

/** Day of the week (0 is Sunday) of the day `offset` days from the reference date. */
export const weekdayOf = (clock: Clock, offset: number): number => (((clock.now.getUTCDay() + offset) % 7) + 7) % 7;

export const isWeekday = (clock: Clock, offset: number): boolean => {
  const weekday = weekdayOf(clock, offset);
  return weekday !== 0 && weekday !== 6;
};

/** The offset itself when it is a weekday, otherwise the following Monday. */
export const nextWeekday = (clock: Clock, offset: number): number => {
  let day = offset;
  while (!isWeekday(clock, day)) {
    day++;
  }
  return day;
};

/** The first `count` offsets from `from` that fall on `weekday`, every `everyWeeks` weeks. */
export const weekly = (
  clock: Clock,
  options: { weekday: number; from: number; count: number; everyWeeks?: number },
): number[] => {
  let first = options.from;
  while (weekdayOf(clock, first) !== options.weekday) {
    first++;
  }
  return Array.from({ length: options.count }, (_, index) => first + index * 7 * (options.everyWeeks ?? 1));
};

/** `count` occurrences 30 days apart from `from`, each moved off the weekend. */
export const monthly = (clock: Clock, options: { from: number; count: number }): number[] =>
  Array.from({ length: options.count }, (_, index) => nextWeekday(clock, options.from + index * 30));
