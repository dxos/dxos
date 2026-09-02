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

describe('get-outline', () => {
  it.effect('returns the markdown and its parsed items', () =>
    Effect.gen(function* () {
      const outline = yield* seed('intro\n- [ ] first\n- [x] second');

      const result = yield* getOutline.handler({ outline: Ref.make(outline) });

      expect(result.name).toBe('Launch plan');
      expect(result.content).toContain('intro');
      expect(result.items).toEqual([
        { title: 'first', done: false },
        { title: 'second', done: true },
      ]);
    }).pipe(Effect.provide(TestDatabaseLayer({ types: [Outline.Outline, Text.Text] }))),
  );
});

const seed = (content: string) =>
  Effect.gen(function* () {
    const outline = yield* Database.add(Outline.make({ name: 'Launch plan', content }));
    yield* Database.flush();
    return outline;
  });
