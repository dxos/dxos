//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { ServiceResolver } from '@dxos/functions';
import { type SpaceId } from '@dxos/keys';
import { Operation } from '@dxos/operation';

import { SheetCapabilities } from '#types';

/**
 * Builds the per-space compute graph registry by adapting the shared
 * {@link Capabilities.ProcessManagerRuntime} into a
 * {@link FunctionsRuntimeProvider} that resolves {@link Operation.Service}
 * from the space's service layer.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const processManagerRuntime = yield* Capability.get(Capabilities.ProcessManagerRuntime);

    // Async import removes direct dependency on hyperformula.
    const { defaultPlugins, ComputeGraphRegistry } = yield* Effect.tryPromise(() => import('@dxos/compute'));

    const computeGraphRegistry = new ComputeGraphRegistry({
      plugins: defaultPlugins,
      computeRuntime: {
        getRuntime: (spaceId: SpaceId) => ({
          runPromise: <A, E>(effect: Effect.Effect<A, E, Operation.Service>) =>
            processManagerRuntime.runPromise(
              effect.pipe(Effect.provide(ServiceResolver.provide({ space: spaceId }, Operation.Service))) as any,
            ),
        }),
      },
    });

    return Capability.contributes(SheetCapabilities.ComputeGraphRegistry, computeGraphRegistry);
  }),
);
