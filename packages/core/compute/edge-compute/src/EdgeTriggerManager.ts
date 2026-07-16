//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { Atom, Registry } from '@effect-atom/atom';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { type Client, ClientService } from '@dxos/client';
import { type Trigger } from '@dxos/compute';
import { RemoteTriggerManager } from '@dxos/compute-runtime';
import { type SpaceId } from '@dxos/keys';

/**
 * EDGE implementation of {@link RemoteTriggerManager.Service}.
 *
 * Edge triggers are ECHO objects replicated into the local database, so the
 * aggregate {@link TriggerMonitor} already surfaces them (marked
 * `environment: 'edge'`) from that database view; the `triggers` atom here is
 * therefore left empty to avoid double-counting. It exists as the seam through
 * which EDGE dispatcher runtime status can be layered in once a mapping to
 * {@link Trigger.State} is available.
 *
 * `invokeTrigger` is not yet supported over the wire (edge triggers run
 * autonomously on the EDGE dispatcher).
 */
const make = (_spaceId?: SpaceId): Layer.Layer<RemoteTriggerManager.Service, never, Registry.AtomRegistry> =>
  Layer.effect(
    RemoteTriggerManager.Service,
    Effect.gen(function* () {
      const registry = yield* Registry.AtomRegistry;
      // TODO(edge): Poll `EdgeHttpClient.getTriggersDispatcherStatus` and enrich edge trigger state here.
      const triggers = Atom.make<readonly Trigger.State[]>([]);
      registry.mount(triggers);
      return {
        triggers,
        invokeTrigger: () => Effect.die(new Error('Remote (EDGE) trigger invocation is not supported')),
      } satisfies RemoteTriggerManager.Manager;
    }),
  );

/**
 * Build from a `Client`.
 */
export const fromClient = (
  _client: Client,
  spaceId?: SpaceId,
): Layer.Layer<RemoteTriggerManager.Service, never, Registry.AtomRegistry> => make(spaceId);

/**
 * Build from the ambient `ClientService`.
 */
export const layer = (
  spaceId?: SpaceId,
): Layer.Layer<RemoteTriggerManager.Service, never, Registry.AtomRegistry | ClientService> =>
  Layer.effect(
    RemoteTriggerManager.Service,
    Effect.gen(function* () {
      yield* ClientService;
      const registry = yield* Registry.AtomRegistry;
      const triggers = Atom.make<readonly Trigger.State[]>([]);
      registry.mount(triggers);
      return {
        triggers,
        invokeTrigger: () => Effect.die(new Error('Remote (EDGE) trigger invocation is not supported')),
      } satisfies RemoteTriggerManager.Manager;
    }),
  );
