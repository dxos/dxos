//
// Copyright 2026 DXOS.org
//

import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { Entity, Filter, Obj } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';

import { SqliteDatabase } from './database.ts';

/** Deterministic LCG so a failing round reproduces. */
const random = (seed: number) => {
  let state = seed;
  const next = () => {
    state = (state * 1_664_525 + 1_013_904_223) % 2 ** 32;
    return state / 2 ** 32;
  };
  const pick = <T>(values: readonly T[]): T => values[Math.floor(next() * values.length)];
  return { next, pick };
};

const STRINGS = ['', 'Alpha', 'alpha', 'beta', '10', 'Zeta'];
const NUMBERS = [-5, 0, 1, 2.5, 10, 42];
const MIXED = ['10', 10, 'x', 0, true];
const TAGS = ['a', 'b', 'c'];

type Rng = ReturnType<typeof random>;

const makeProps = (rng: Rng): Record<string, unknown> => {
  const props: Record<string, unknown> = {};
  const maybe = (key: string, value: () => unknown, nullable = true) => {
    const roll = rng.next();
    if (roll < 0.15) {
      return;
    }
    props[key] = nullable && roll < 0.2 ? null : value();
  };
  // Never null: these take ordering comparisons, and JS coerces `null` to 0 there (`null >= 0`).
  maybe('str', () => rng.pick(STRINGS), false);
  maybe('num', () => rng.pick(NUMBERS), false);
  maybe('flag', () => rng.next() < 0.5);
  maybe('mixed', () => rng.pick(MIXED));
  maybe('nested', () => ({ x: rng.pick(NUMBERS), y: rng.pick(STRINGS) }));
  maybe('tags', () => TAGS.filter(() => rng.next() < 0.5));
  maybe('items', () => TAGS.filter(() => rng.next() < 0.4).map((k) => ({ k })));
  return props;
};

/**
 * A random property filter. Ordering comparisons only run on fields holding one type, with an operand
 * of that type: JS coerces across types (`'10' > 5`, `null >= 0`) and SQL deliberately does not, a
 * documented divergence.
 */
const makeValueFilter = (rng: Rng): [string, Filter.Any] => {
  const any = () => rng.pick<unknown>([...STRINGS, ...NUMBERS, ...MIXED, null]);
  switch (Math.floor(rng.next() * 9)) {
    case 0:
      return [rng.pick(['str', 'num', 'mixed', 'flag']), Filter.eq(any())];
    case 1:
      return [rng.pick(['str', 'num', 'mixed']), Filter.neq(any())];
    case 2: {
      const [field, pool] = rng.pick<[string, readonly (string | number)[]]>([
        ['str', STRINGS],
        ['num', NUMBERS],
      ]);
      const operator = rng.pick([Filter.gt, Filter.gte, Filter.lt, Filter.lte]);
      return [field, operator(rng.pick(pool))];
    }
    case 3:
      return [rng.pick(['str', 'num', 'mixed']), Filter.in(any(), any(), any())];
    case 4: {
      const [field, pool] = rng.pick<[string, readonly (string | number)[]]>([
        ['str', STRINGS],
        ['num', NUMBERS],
      ]);
      const [from, to] = [rng.pick(pool), rng.pick(pool)].sort((a, b) => (a < b ? -1 : 1));
      return [field, Filter.between(from, to)];
    }
    case 5:
      return ['tags', Filter.contains(rng.pick(TAGS))];
    case 6:
      return ['items', Filter.contains({ k: rng.pick(TAGS) })];
    case 7:
      return ['nested', Filter.props({ x: Filter.gt(rng.pick(NUMBERS)) })];
    default:
      return [rng.pick(['str', 'num']), Filter.not(Filter.eq(any()))];
  }
};

const makeFilter = (rng: Rng, depth = 0): Filter.Any => {
  const roll = rng.next();
  if (depth < 2 && roll < 0.15) {
    return Filter.and(makeFilter(rng, depth + 1), makeFilter(rng, depth + 1));
  }
  if (depth < 2 && roll < 0.3) {
    return Filter.or(makeFilter(rng, depth + 1), makeFilter(rng, depth + 1));
  }
  if (depth < 2 && roll < 0.4) {
    return Filter.not(makeFilter(rng, depth + 1));
  }
  const [field, valueFilter] = makeValueFilter(rng);
  return Filter.type(TestSchema.Expando, { [field]: valueFilter });
};

describe('Compiled SQL vs the in-memory matcher (T-3)', () => {
  it.effect('selects the same objects for random filters', () =>
    Effect.scoped(
      Effect.gen(function* () {
        const db = yield* SqliteDatabase.open({ types: [TestSchema.Expando] });
        yield* Effect.promise(async () => {
          const rng = random(7);
          const objects = Array.from({ length: 150 }, () => db.add(Obj.make(TestSchema.Expando, makeProps(rng))));
          await db.flush();

          let nonEmpty = 0;
          for (let round = 0; round < 200; round++) {
            const filter = makeFilter(rng);
            const expected = objects.filter((object) => Filter.toPredicate(object, filter)).map((object) => object.id);
            const actual = (await db.query(filter).run()).map((entity: Entity.Unknown) => entity.id);
            expect({ round, filter: filter.ast, ids: [...actual].sort() }).toEqual({
              round,
              filter: filter.ast,
              ids: [...expected].sort(),
            });
            nonEmpty += expected.length > 0 ? 1 : 0;
          }
          expect(nonEmpty).toBeGreaterThan(50);
        });
      }),
    ).pipe(Effect.provide(SqliteClient.layer({ filename: ':memory:' }))),
  );
});
