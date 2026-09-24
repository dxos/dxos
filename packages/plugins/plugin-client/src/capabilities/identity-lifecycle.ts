//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { type Client } from '@dxos/client';
import { EffectEx } from '@dxos/effect';
import { log } from '@dxos/log';

import { ClientCapabilities, ClientEvents } from '#types';

/** The deck's workspace before any space is chosen — where a cold boot starts. */
const DEFAULT_WORKSPACE = 'default';

/** Resolves once none of `spaceIds` is in the client's space list, which trails the deletion. */
const awaitSpacesGone = (client: Client, spaceIds: readonly string[]): Effect.Effect<void> =>
  Effect.callback<void>((resume) => {
    const subscription = client.spaces.subscribe((spaces) => {
      if (!spaces.some((space) => spaceIds.includes(space.id))) {
        resume(Effect.void);
      }
    });
    return Effect.sync(() => subscription.unsubscribe());
  });

/**
 * Carries the app across an identity deleted in place (`client.halo.deleteIdentity()`), which keeps
 * the client — and so the whole session — alive.
 *
 * On deletion the app is put back where a boot with no identity leaves it: the deck on the default
 * workspace and the one-shot `SpacesAvailable` wave re-run against a space list without the deleted
 * identity's spaces, so whichever identity arrives next — created, joined or recovered — is picked up
 * exactly as on a cold start.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const client = yield* ClientCapabilities.Client;
    const manager = yield* Capabilities.PluginManager;
    const { invoke } = yield* Capabilities.OperationInvoker;
    const registry = yield* Capabilities.AtomRegistry;
    const accountCache = yield* ClientCapabilities.AccountCache;

    const resetSession = (deletedSpaceIds: readonly string[]) =>
      Effect.gen(function* () {
        yield* invoke(LayoutOperation.SwitchWorkspace, { subject: DEFAULT_WORKSPACE });
        // Re-run only once the deleted spaces have left the list, or the wave would bootstrap from them.
        yield* awaitSpacesGone(client, deletedSpaceIds);
        yield* manager.reset(ClientEvents.SpacesAvailable);
      }).pipe(
        Effect.catchCause((cause) =>
          Effect.sync(() => log.warn('resetting the session after deletion failed', { cause })),
        ),
      );

    // `client.halo` is replaced when the services reconnect, so the watch follows it.
    let unsubscribe = () => {};
    const watchIdentity = () => {
      unsubscribe();
      let hadIdentity = client.halo.identity.get() !== null;
      const subscription = client.halo.identity.subscribe((identity) => {
        // A reset also drops the identity, but it tears the whole client down with it.
        if (hadIdentity && !identity && !client.resetting) {
          log.info('identity deleted in place');
          registry.set(accountCache, {});
          void EffectEx.runPromise(resetSession(client.spaces.get().map((space) => space.id)));
        }
        hadIdentity = identity !== null;
      });
      unsubscribe = () => subscription.unsubscribe();
    };
    watchIdentity();
    const unsubscribeReloaded = client.reloaded.on(watchIdentity);

    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        unsubscribeReloaded();
        unsubscribe();
      }),
    );
    return [];
  }),
);
