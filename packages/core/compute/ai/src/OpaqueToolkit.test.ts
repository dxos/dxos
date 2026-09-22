//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import * as Stream from 'effect/Stream';
import * as Tool from 'effect/unstable/ai/Tool';
import * as Toolkit from 'effect/unstable/ai/Toolkit';

import * as OpaqueToolkit from './OpaqueToolkit.ts';

const AgeToolkit = Toolkit.make(
  Tool.make('age', {
    description: 'Gets the age',
    parameters: Schema.Struct({}),
    success: Schema.Number,
  }),
);

const ageOpaque = OpaqueToolkit.make(
  AgeToolkit,
  AgeToolkit.toLayer({
    age: Effect.fn(function* () {
      return 42;
    }),
  }),
);

const NameToolkit = Toolkit.make(
  Tool.make('name', {
    description: 'Gets the name',
    parameters: Schema.Struct({}),
    success: Schema.String,
  }),
);

const nameOpaque = OpaqueToolkit.make(
  NameToolkit,
  NameToolkit.toLayer({
    name: Effect.fn(function* () {
      return 'Alice';
    }),
  }),
);

describe('OpaqueToolkit.merge', () => {
  it.effect(
    'returns a usable empty toolkit when called with no arguments',
    Effect.fn(function* ({ expect }) {
      const merged = OpaqueToolkit.merge();

      expect(merged.layer).toBeDefined();
      expect(merged.toolkit).toBeDefined();

      const provided = Effect.gen(function* () {
        const provider = yield* OpaqueToolkit.OpaqueToolkitProvider;
        return yield* provider.getToolkit();
      }).pipe(Effect.provide(OpaqueToolkit.providerLayer(merged)));

      const result = yield* provided;
      expect(Object.keys(result.toolkit.tools)).toEqual([]);
    }),
  );

  it.effect(
    'preserves a single toolkit',
    Effect.fn(function* ({ expect }) {
      const merged = OpaqueToolkit.merge(ageOpaque);

      const withHandler = yield* merged.handlers;
      expect(Object.keys(withHandler.tools).sort()).toEqual(['age']);

      const ageResult = yield* withHandler.handle('age', {} as never).pipe(Effect.flatMap(Stream.runLast));
      expect(Option.getOrThrow(ageResult).result).toEqual(42);
    }),
  );

  it.effect(
    'merges multiple toolkits',
    Effect.fn(function* ({ expect }) {
      const merged = OpaqueToolkit.merge(ageOpaque, nameOpaque);

      const withHandler = yield* merged.handlers;
      expect(Object.keys(withHandler.tools).sort()).toEqual(['age', 'name']);

      const ageResult = yield* withHandler.handle('age', {} as never).pipe(Effect.flatMap(Stream.runLast));
      const nameResult = yield* withHandler.handle('name', {} as never).pipe(Effect.flatMap(Stream.runLast));
      expect(Option.getOrThrow(ageResult).result).toEqual(42);
      expect(Option.getOrThrow(nameResult).result).toEqual('Alice');
    }),
  );
});
