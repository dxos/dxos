//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { Database, Ref } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { URI } from '@dxos/keys';
import { Text } from '@dxos/schema';
import { Outline } from '@dxos/types';

import updateOutline from './update-outline.ts';

describe('update-outline', () => {
  it.effect('upserts items in place and preserves prose', () =>
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
    }).pipe(Effect.provide(TestDatabaseLayer({ types: [Outline.Outline, Text.Text] }))),
  );

  it.effect('replaces wholesale with content, and rejects both/neither', () =>
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
    }).pipe(Effect.provide(TestDatabaseLayer({ types: [Outline.Outline, Text.Text] }))),
  );

  it.effect('validates arguments before touching the database', () =>
    Effect.gen(function* () {
      // A bad argument must report as an argument error even when the ref cannot be loaded —
      // i.e. validation runs before the read, so the caller never sees a storage error instead.
      const dangling: Ref.Ref<Outline.Outline> = Ref.fromURI(URI.make('echo:///01JQNEVERWASADOCUMENT00'));

      for (const input of [{}, { content: 'x', items: [{ title: 'y', done: false }] }]) {
        const exit = yield* Effect.exit(updateOutline.handler({ outline: dangling, ...input }));
        expect(exit._tag).toBe('Failure');
        expect(String(exit)).toContain('InvalidOperationInput');
      }
    }).pipe(Effect.provide(TestDatabaseLayer({ types: [Outline.Outline, Text.Text] }))),
  );
});

/** Seeds an outline with the given checklist markdown. */
const seed = (content: string) =>
  Effect.gen(function* () {
    const outline = yield* Database.add(Outline.make({ name: 'Launch plan', content }));
    yield* Database.flush();
    return outline;
  });
