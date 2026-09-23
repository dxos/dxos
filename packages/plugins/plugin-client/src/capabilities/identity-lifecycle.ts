//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { EffectEx } from '@dxos/effect';
import { log } from '@dxos/log';

import { ClientCapabilities, ClientEvents } from '#types';

/** The deck's workspace before any space is chosen — where a cold boot starts. */
const DEFAULT_WORKSPACE = 'default';

/**
 * Carries the app across an identity deleted in place (`client.halo.deleteIdentity()`), which keeps
 * the client — and so the whole session — alive where a storage reset used to reload the page.
 *
 * On deletion the app is put back where a boot with no identity leaves it: the deck on the default
 * workspace and the one-shot `SpacesAvailable` wave re-run against the empty space list, so whichever
 * identity arrives next — created, joined or recovered — is picked up exactly as on a cold start.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const client = yield* ClientCapabilities.Client;
    const manager = yield* Capabilities.PluginManager;
    const { invoke } = yield* Capabilities.OperationInvoker;
    const registry = yield* Capabilities.AtomRegistry;
    const accountCache = yield* ClientCapabilities.AccountCache;

    const resetSession = Effect.gen(function* () {
      yield* invoke(LayoutOperation.SwitchWorkspace, { subject: DEFAULT_WORKSPACE });
      yield* manager.reset(ClientEvents.SpacesAvailable);
    }).pipe(
      Effect.catch((error) => Effect.sync(() => log.warn('resetting the session after deletion failed', { error }))),
    );

    let hadIdentity = client.halo.identity.get() !== null;
    const subscription = client.halo.identity.subscribe((identity) => {
      if (hadIdentity && !identity) {
        log.info('identity deleted in place');
        registry.set(accountCache, {});
        void EffectEx.runPromise(resetSession);
      }
      hadIdentity = identity !== null;
    });

    yield* Effect.addFinalizer(() => Effect.sync(() => subscription.unsubscribe()));
    return [];
  }),
);
