//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { describe, test } from 'vitest';

import { OpaqueToolkit, ToolResolverService } from '@dxos/ai';
import { makeToolResolverFromOperations } from '@dxos/assistant';
import * as Operation from '@dxos/compute/Operation';
import { Registry } from '@dxos/echo';
import { makeRegistry } from '@dxos/echo-client';
import * as EffectEx from '@dxos/effect/EffectEx';

import { SheetOperationHandlerSet } from '../operations/node.ts';
import skill from './sheet-skill.ts';

describe('Sheet skill', () => {
  // EDGE resolves a skill's tools only against the records of the headless entry's handlers, as built here.
  test('every tool resolves against the operation records of the headless entry', async ({ expect }) => {
    const handlers = await SheetOperationHandlerSet.getHandlers();
    const registry = makeRegistry({
      initial: handlers
        .filter((handler) => !handler.meta.skipRegistry)
        .map((handler) => Operation.serialize(handler, { skipValidation: true })),
    });
    const tools = skill.make().tools;

    const unresolved = await Effect.gen(function* () {
      const resolver = yield* ToolResolverService;
      const results = yield* Effect.forEach(tools, (id) =>
        resolver.resolve(id).pipe(Effect.match({ onFailure: () => [String(id)], onSuccess: () => [] })),
      );
      return results.flat();
    }).pipe(
      Effect.provide(
        Layer.provideMerge(
          makeToolResolverFromOperations().pipe(Layer.provide(Layer.succeed(Registry.Service, registry))),
          OpaqueToolkit.providerLayer(OpaqueToolkit.empty),
        ),
      ),
      EffectEx.runPromise,
    );

    expect(tools.length).toBeGreaterThan(0);
    expect(unresolved).toEqual([]);
  });
});
