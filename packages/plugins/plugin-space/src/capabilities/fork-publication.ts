//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';
import { log } from '@dxos/log';

import { SpaceOperation, type SpaceSchema } from '#types';

import { SpaceNamespace } from '../namespace.ts';
import { takeForkIntent } from '../publication/pending-fork.ts';

/**
 * Runs a stashed fork once spaces are available, which is after onboarding has produced an identity:
 * the sign-in gate is the activation event itself.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* (options: SpaceSchema.SpacePluginOptions = {}) {
    const pending = options.publication ? takeForkIntent() : undefined;
    if (!pending) {
      return [];
    }
    const capabilities = yield* Capability.Service;
    const operationService = yield* Capabilities.OperationInvoker;
    log.info('forking publication', { publicId: pending.publicId });
    // Its own fiber root: fetching and importing outlives this module's activation, which would interrupt a child.
    const fork = Operation.invoke(SpaceOperation.ForkPublication, {
      publicId: pending.publicId,
      path: pending.path,
    }).pipe(
      Effect.catch((error) =>
        Effect.gen(function* () {
          log.warn('fork failed', { error, publicId: pending.publicId });
          yield* Operation.invoke(LayoutOperation.AddToast, {
            id: `${SpaceNamespace.key}/fork-failed`,
            title: ['fork-failed-toast.title', { ns: SpaceNamespace.key }],
            icon: 'ph--warning--regular',
          }).pipe(Effect.ignore);
        }),
      ),
      Effect.provideService(Capability.Service, capabilities),
      Effect.provideService(Operation.Service, operationService),
    );
    Effect.runFork(fork);
    return [];
  }),
);
