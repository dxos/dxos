//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { Database, Ref } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { Text } from '@dxos/schema';
import { Outline } from '@dxos/types';

import getOutline from './get-outline';
import updateOutline from './update-outline';

const testLayer = () => TestDatabaseLayer({ types: [Outline.Outline, Text.Text] });

const seed = (content: string) =>
  Effect.gen(function* () {
    const outline = yield* Database.add(Outline.make({ name: 'Launch plan', content }));
    yield* Database.flush();
    return outline;
  });

describe('outline operations', () => {
  it.effect('get-outline returns the markdown and its parsed items', () =>
    Effect.gen(function* () {
      const outline = yield* seed('intro\n- [ ] first\n- [x] second');

      const result = yield* getOutline.handler({ outline: Ref.make(outline) });

      expect(result.name).toBe('Launch plan');
      expect(result.content).toContain('intro');
      expect(result.items).toEqual([
        { title: 'first', done: false },
        { title: 'second', done: true },
      ]);
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect('update-outline upserts items in place and preserves prose', () =>
    Effect.gen(function* () {
      const outline = yield* seed('intro\n- [ ] first\n- [ ] second');

      const result = yield* updateOutline.handler({
        outline: Ref.make(outline),
        items: [
          { title: 'first', done: true },
          { title: 'third', done: false },
        ],
      });

      expect(result.content.split('\n')).toEqual(['intro', '- [x] first', '- [ ] second', '- [ ] third']);
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect('update-outline replaces wholesale with content, and rejects both/neither', () =>
    Effect.gen(function* () {
      const outline = yield* seed('- [ ] first');

      const result = yield* updateOutline.handler({ outline: Ref.make(outline), content: '- [x] rewritten' });
      expect(result.content).toBe('- [x] rewritten');

      const both = yield* Effect.exit(
        updateOutline.handler({ outline: Ref.make(outline), content: 'x', items: [{ title: 'y', done: false }] }),
      );
      expect(both._tag).toBe('Failure');

      const neither = yield* Effect.exit(updateOutline.handler({ outline: Ref.make(outline) }));
      expect(neither._tag).toBe('Failure');
    }).pipe(Effect.provide(testLayer())),
  );
});
