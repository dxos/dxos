//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import * as Fact from './Fact.ts';

describe('Fact', () => {
  it.effect(
    'fills defaults and derives a content id',
    Effect.fnUntraced(function* () {
      const fact = yield* Fact.make({
        subject: { entity: 'dima' },
        predicate: 'works_on',
        object: { label: 'indexer' },
      });
      expect(fact).toMatchObject({ polarity: '+', force: 'assertive' });
      expect(fact.id).toMatch(/^fact-[0-9a-f]{16}$/);

      // Key order does not change the id; content does.
      const same = yield* Fact.make({
        object: { label: 'indexer' },
        predicate: 'works_on',
        subject: { entity: 'dima' },
      });
      const other = yield* Fact.make({
        subject: { entity: 'dima' },
        predicate: 'works_on',
        object: { label: 'release' },
      });
      expect(same.id).toBe(fact.id);
      expect(other.id).not.toBe(fact.id);
      expect(Fact.equals(fact, same)).toBe(true);
    }),
  );

  it.effect(
    'keeps an explicit id',
    Effect.fnUntraced(function* () {
      const fact = yield* Fact.make({ id: 'f1', subject: { entity: 'a' }, predicate: 'p', object: { literal: '1' } });
      expect(fact.id).toBe('f1');
    }),
  );

  it.effect(
    'rejects malformed input with a typed error',
    Effect.fnUntraced(function* () {
      const inputs: unknown[] = [
        { subject: {}, predicate: 'p', object: { entity: 'b' } },
        { subject: { entity: 'a' }, predicate: '', object: { entity: 'b' } },
        { subject: { entity: 'a' }, predicate: 'p', object: { entity: 'b' }, polarity: 'maybe' },
        { subject: { entity: 'a' }, object: { entity: 'b' } },
      ];
      for (const input of inputs) {
        const error = yield* Effect.flip(Fact.make(input));
        expect(error).toBeInstanceOf(Fact.ValidationError);
      }
    }),
  );

  it.effect(
    'matches every pattern field',
    Effect.fnUntraced(function* () {
      const fact = yield* Fact.make({
        subject: { entity: 'dima' },
        predicate: 'will_help',
        object: { label: 'agent plugin' },
        speaker: 'dima',
        source: 'dxn:message:1',
        force: 'commissive',
        polarity: '-',
        quote: 'Busy with the release this week',
        saidAt: '2026-10-06T10:00:00Z',
      });
      const hits: Fact.Pattern[] = [
        {},
        { subject: 'dima' },
        { entity: 'agent plugin' },
        { predicate: 'will_help' },
        { object: 'agent plugin' },
        { source: 'dxn:message:1' },
        { speaker: 'dima' },
        { force: 'commissive', polarity: '-' },
        { about: 'Agent PLUGIN' },
        { about: 'release help' },
        { text: 'busy with' },
        { after: '2026-10-06T10:00:00Z', before: '2026-10-07T00:00:00Z' },
      ];
      const misses: Fact.Pattern[] = [
        { subject: 'rich' },
        { entity: 'rich' },
        { predicate: 'works_on' },
        { object: 'dima' },
        { source: 'dxn:message:2' },
        { speaker: 'rich' },
        { force: 'assertive' },
        { polarity: '+' },
        { about: 'taxes' },
        { text: 'not busy' },
        { after: '2026-10-06T10:00:01Z' },
        { before: '2026-10-06T10:00:00Z' },
      ];
      expect(hits.filter((pattern) => !Fact.matches(pattern, fact))).toEqual([]);
      expect(misses.filter((pattern) => Fact.matches(pattern, fact))).toEqual([]);
      expect(Fact.format(fact)).toBe('dima · commissive - · dima will_help agent plugin');
    }),
  );

  it('reads a term as its entity, else its label, else its literal', () => {
    expect(Fact.valueOf({ entity: 'dima', label: 'Dima' })).toBe('dima');
    expect(Fact.valueOf({ label: 'Dima', literal: 'x' })).toBe('Dima');
    expect(Fact.valueOf({ literal: '42' })).toBe('42');
  });
});
