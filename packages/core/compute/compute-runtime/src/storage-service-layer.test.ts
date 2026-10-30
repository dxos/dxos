//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as KeyValueStore from 'effect/persistence/KeyValueStore';
import * as Schema from 'effect/Schema';

import { layer } from './storage-service-layer.ts';

describe('storage service layer', () => {
  it.effect(
    'a clear built before the writes removes them when it runs',
    Effect.fn(function* ({ expect }) {
      const storage = layer(yield* KeyValueStore.KeyValueStore, 'process/p1/');
      const clear = storage.clear();
      yield* storage.set(Schema.String, 'key', 'value');
      yield* clear;
      expect(Option.isNone(yield* storage.get(Schema.String, 'key'))).toBe(true);
    }, Effect.provide(KeyValueStore.layerMemory)),
  );
});
