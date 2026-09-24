//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import * as ServiceResolver from '@dxos/compute/ServiceResolver';
import { type SpaceId } from '@dxos/keys';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';

import { SheetCapabilities } from '#types';

/**
 * Builds the per-space compute graph registry by adapting the shared
 * {@link Capabilities.ProcessManagerRuntime} into a
 * {@link FunctionsRuntimeProvider} that resolves {@link Operation.Service}
 * from the space's service layer.
 */
export const ComputeGraphRegistry = Capability.makeModule(
  'ComputeGraphRegistry',
  {
    // Headless: formulas evaluate in a markdown document with no sheet surface ever rendered, so
    // gating this on the sheet's own start conflates "the sheet UI is on screen" with "compute
    // graphs exist". Ungated (hence idle) it also becomes pullable by the consumers that need it
    // earlier, which a start-gated provider is not.
    requires: [ClientCapabilities.Client, Capabilities.ProcessManagerRuntime],
    provides: [SheetCapabilities.ComputeGraphRegistry],
  },
  Effect.fnUntraced(function* () {
    const processManagerRuntime = yield* Capabilities.ProcessManagerRuntime;

    // Async import removes direct dependency on hyperformula.
    const { defaultPlugins, ComputeGraphRegistry } = yield* Effect.tryPromise(
      () => import('@dxos/compute-hyperformula'),
    );

    const computeGraphRegistry = new ComputeGraphRegistry({
      plugins: defaultPlugins,
      computeRuntime: {
        getRuntime: (spaceId: SpaceId) => ({
          runPromise: <A, E>(effect: Effect.Effect<A, E, Operation.Service>) =>
            processManagerRuntime.runPromise(
              effect.pipe(Effect.provide(ServiceResolver.provide({ space: spaceId }, Operation.Service))),
            ),
        }),
      },
    });

    return Capability.contribute(SheetCapabilities.ComputeGraphRegistry, computeGraphRegistry);
  }),
);
