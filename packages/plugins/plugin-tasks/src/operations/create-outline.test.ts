//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { Obj } from '@dxos/echo';
import { Outline } from '@dxos/types';

import createOutline from './create-outline';

describe('create-outline', () => {
  it.effect('returns a detached outline carrying its own text object', () =>
    Effect.gen(function* () {
      const { object } = yield* createOutline.handler({ name: 'Launch plan' });

      expect(Obj.instanceOf(Outline.Outline, object)).toBe(true);
      expect(object.name).toBe('Launch plan');
      // The content ref is materialized here so the outline is never persisted without its text.
      expect(object.content.target?.content).toBe('');
    }),
  );

  it.effect('names are optional', () =>
    Effect.gen(function* () {
      const { object } = yield* createOutline.handler({});

      expect(object.name).toBeUndefined();
    }),
  );

  it.effect('never touches the database — the caller decides where it lands', () =>
    Effect.gen(function* () {
      // The handler declares no `Database.Service`, so it runs with no layer at all; `AddObject` is
      // what files the draft, which is why two calls cannot collide on a half-written outline.
      const first = yield* createOutline.handler({ name: 'One' });
      const second = yield* createOutline.handler({ name: 'Two' });

      expect(Obj.getDatabase(first.object)).toBeUndefined();
      expect(first.object.id).not.toBe(second.object.id);
    }),
  );
});
