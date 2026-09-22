//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { Database, Obj, Ref, Type } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { URI } from '@dxos/keys';
import { Text } from '@dxos/schema';
import { Outline } from '@dxos/types';

import { InvalidOperationInput } from '../errors.ts';
import getOutline from './get-outline.ts';

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

  it.effect('fails with a typed error when the ref is not an outline', () =>
    Effect.gen(function* () {
      const other = yield* Database.add(Text.make({ content: 'not an outline' }));
      yield* Database.flush();

      // Built from the URI rather than the object: the caller is a model passing an id, which is
      // exactly the shape the ref's static type cannot vouch for.
      const ref = yield* Database.makeRef<Outline.Outline>(URI.make(Obj.getURI(other)));
      // A raw `TypeError: Cannot read properties of undefined (reading 'tryLoad')` is the regression,
      // so the assertion is on the error's type and its whole message, not on a substring.
      const error = yield* Effect.flip(getOutline.handler({ outline: ref }));

      expect(error).toBeInstanceOf(InvalidOperationInput);
      expect(error.message).toBe(`Not an outline: ${Type.getTypename(Text.Text)}.`);
    }).pipe(Effect.provide(TestDatabaseLayer({ types: [Outline.Outline, Text.Text] }))),
  );
});

const seed = (content: string) =>
  Effect.gen(function* () {
    const outline = yield* Database.add(Outline.make({ name: 'Launch plan', content }));
    yield* Database.flush();
    return outline;
  });
