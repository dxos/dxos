//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Builtin from '@dxos/datalog/Builtin';

/** Finds facts about a topic; a semantic index replaces the keyword one without touching rules. */
export interface TextIndex {
  add(factId: string, text: string): void;
  /** True if the fact is about `query`. */
  matches(factId: string, query: string): boolean;
  /** Every fact about `query`. */
  search(query: string): Iterable<string>;
}

/** The entities each fact concerns (entity resolution), for scoping possessive goals. */
export interface EntityIndex {
  add(factId: string, entities: ReadonlyArray<string>): void;
  concerns(factId: string): ReadonlyArray<string>;
  facts(entity: string): Iterable<string>;
}

/** What the time built-ins read; `previous` is the time of the evaluation before this one. */
export type Clock = {
  readonly now: () => number;
  readonly previous: () => number;
  /** When the goal was created; `elapsed(goal, …)` measures from it. */
  readonly createdAt: number;
  /** When a fact was said, for `elapsed(F, …)`. */
  readonly saidAt: (factId: string) => number | undefined;
};

export type Context = {
  readonly clock: Clock;
  readonly text: TextIndex;
  readonly entities: EntityIndex;
};

const STOP_WORDS = new Set([
  'the',
  'a',
  'an',
  'of',
  'to',
  'on',
  'in',
  'for',
  'and',
  'or',
  'with',
  'about',
  'is',
  'my',
  'me',
  'this',
  'that',
  'at',
  'by',
  'it',
]);

const stem = (word: string): string => {
  let stemmed = word.toLowerCase();
  if (stemmed.length > 4 && stemmed.endsWith('ing')) {
    stemmed = stemmed.slice(0, -3);
  } else if (stemmed.length > 3 && (stemmed.endsWith('ed') || stemmed.endsWith('es'))) {
    stemmed = stemmed.slice(0, -2);
  } else if (stemmed.length > 2 && stemmed.endsWith('s')) {
    stemmed = stemmed.slice(0, -1);
  }
  if (stemmed.length > 3 && stemmed.at(-1) === stemmed.at(-2)) {
    stemmed = stemmed.slice(0, -1);
  }
  return stemmed;
};

const words = (text: string): string[] =>
  text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

/** True if every non-stop keyword of `query` (stemmed, prefix-tolerant) occurs in `text`. */
export const keywordMatch = (text: string, query: string): boolean => {
  const stems = new Set(words(text).map(stem));
  const keywords = words(query)
    .filter((word) => !STOP_WORDS.has(word))
    .map(stem);
  return (
    keywords.length > 0 &&
    keywords.every((keyword) =>
      [...stems].some(
        (candidate) =>
          candidate === keyword ||
          (keyword.length >= 4 && candidate.startsWith(keyword)) ||
          (candidate.length >= 4 && keyword.startsWith(candidate)),
      ),
    )
  );
};

/** Keyword stand-in for a semantic index. */
export class KeywordIndex implements TextIndex {
  readonly #texts = new Map<string, string>();

  add(factId: string, text: string): void {
    this.#texts.set(factId, text);
  }

  matches(factId: string, query: string): boolean {
    return keywordMatch(this.#texts.get(factId) ?? '', query);
  }

  *search(query: string): Iterable<string> {
    for (const [factId, text] of this.#texts) {
      if (keywordMatch(text, query)) {
        yield factId;
      }
    }
  }
}

/** In-memory entity index. */
export class MemoryEntityIndex implements EntityIndex {
  readonly #byFact = new Map<string, ReadonlyArray<string>>();

  add(factId: string, entities: ReadonlyArray<string>): void {
    this.#byFact.set(factId, entities);
  }

  concerns(factId: string): ReadonlyArray<string> {
    return this.#byFact.get(factId) ?? [];
  }

  *facts(entity: string): Iterable<string> {
    for (const [factId, entities] of this.#byFact) {
      if (entities.includes(entity)) {
        yield factId;
      }
    }
  }
}

const DURATION_UNITS: Record<string, number> = { s: 1e3, m: 6e4, h: 36e5, d: 864e5, w: 6048e5 };

/** Parses `30s`, `5m`, `2h`, `2d`, `1w` (optionally ISO-prefixed `P`/`PT`) to milliseconds. */
export const parseDuration = (duration: string | number): number | undefined => {
  const match = /^P?T?(\d+(?:\.\d+)?)\s*([smhdw])$/i.exec(String(duration).trim());
  const unit = match ? DURATION_UNITS[match[2].toLowerCase()] : undefined;
  return match && unit !== undefined ? Number(match[1]) * unit : undefined;
};

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const parseTime = (value: string | number): number | undefined => {
  const time = typeof value === 'number' ? value : Date.parse(value);
  return Number.isNaN(time) ? undefined : time;
};

/**
 * The goal built-ins: `about(F, Text)` and `concerns(F, Entity)` (both may bind `F`),
 * `elapsed(Ref, Duration)` (`Ref` is `goal`, a fact id or a time), `every(Duration)` (a period
 * boundary passed since the previous evaluation), `due(Time, Lead)`, `weekday(Time, Day)` and
 * `hour(Time, Hour)` (UTC).
 */
export const make = ({ clock, text, entities }: Context): Builtin.Registry => {
  const reference = (value: string | number): number | undefined =>
    value === 'goal' ? clock.createdAt : (clock.saidAt(String(value)) ?? parseTime(value));

  return Builtin.registry(
    Builtin.make({
      name: 'about',
      arity: 2,
      modes: ['fb'],
      evaluate: ([factId, query]) => {
        if (query === undefined) {
          return [];
        }
        if (factId === undefined) {
          return [...text.search(String(query))].map((id) => [id, query]);
        }
        return text.matches(String(factId), String(query)) ? [[factId, query]] : [];
      },
    }),
    Builtin.make({
      name: 'concerns',
      arity: 2,
      modes: ['fb'],
      evaluate: ([factId, entity]) => {
        if (entity === undefined) {
          return [];
        }
        if (factId === undefined) {
          return [...entities.facts(String(entity))].map((id) => [id, entity]);
        }
        return entities.concerns(String(factId)).includes(String(entity)) ? [[factId, entity]] : [];
      },
    }),
    Builtin.predicate(
      'elapsed',
      2,
      ([ref, duration]) => {
        const start = reference(ref);
        const length = parseDuration(duration);
        return start !== undefined && length !== undefined && clock.now() - start >= length;
      },
      { volatile: true },
    ),
    Builtin.predicate(
      'every',
      1,
      ([duration]) => {
        const period = parseDuration(duration);
        if (period === undefined || period <= 0) {
          return false;
        }
        const tick = (time: number) => Math.floor((time - clock.createdAt) / period);
        return tick(clock.now()) > tick(clock.previous());
      },
      { volatile: true },
    ),
    Builtin.predicate(
      'due',
      2,
      ([time, lead]) => {
        const deadline = parseTime(time);
        const length = parseDuration(lead);
        return deadline !== undefined && length !== undefined && clock.now() >= deadline - length;
      },
      { volatile: true },
    ),
    Builtin.make({
      name: 'weekday',
      arity: 2,
      modes: ['bf'],
      evaluate: ([time, day]) => {
        const parsed = time === undefined ? undefined : parseTime(time);
        if (time === undefined || parsed === undefined) {
          return [];
        }
        const weekday = WEEKDAYS[new Date(parsed).getUTCDay()];
        if (day === undefined) {
          return [[time, weekday]];
        }
        return String(day).toLowerCase() === weekday ? [[time, day]] : [];
      },
    }),
    Builtin.make({
      name: 'hour',
      arity: 2,
      modes: ['bf'],
      evaluate: ([time, hour]) => {
        const parsed = time === undefined ? undefined : parseTime(time);
        if (time === undefined || parsed === undefined) {
          return [];
        }
        const value = new Date(parsed).getUTCHours();
        if (hour === undefined) {
          return [[time, value]];
        }
        return Number(hour) === value ? [[time, hour]] : [];
      },
    }),
  );
};

/** A context with empty indexes and a frozen clock, for checking rules without evaluating them. */
export const emptyContext = (): Context => ({
  clock: { now: () => 0, previous: () => 0, createdAt: 0, saidAt: () => undefined },
  text: new KeywordIndex(),
  entities: new MemoryEntityIndex(),
});
