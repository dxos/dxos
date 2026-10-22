//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Atom from 'effect/reactivity/Atom';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { Context } from '@dxos/context';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';

import { makePushRegistration } from '#push';
import { MessengerCapabilities } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const client = yield* ClientCapabilities.Client;
    const registry = yield* Capabilities.AtomRegistry;
    const settingsAtom = yield* MessengerCapabilities.Settings;
    // Optional, and read live rather than once: only platforms with a push service contribute one, and plugin-pwa
    // does so on Idle, which can come after this module's activation on SpacesAvailable.
    const providers = yield* Capability.contributions(AppCapabilities.PushProvider);

    // The outcome of the last attempt; until there is one, the status follows whether a provider is here yet.
    const result = Atom.make<MessengerCapabilities.PushStatus | undefined>(undefined).pipe(Atom.keepAlive);
    const status = Atom.make(
      (get): MessengerCapabilities.PushStatus =>
        get(result) ?? (get(providers.atom)[0]?.supported ? 'off' : 'unsupported'),
    ).pipe(Atom.keepAlive);
    const ctx = Context.default();
    const registration = makePushRegistration({
      provider: () => providers.get()[0],
      edge: {
        getVapidPublicKey: () => client.edge.http.getVapidPublicKey(ctx),
        putPushSubscription: (subscription) => client.edge.http.putPushSubscription(ctx, subscription),
        deletePushSubscription: (endpoint) => client.edge.http.deletePushSubscription(ctx, endpoint),
      },
      setStatus: (next) => registry.set(result, next),
    });

    const setOptedIn = (notifications: boolean) =>
      registry.set(settingsAtom, { ...registry.get(settingsAtom), notifications });

    // Re-registering on every start keeps EDGE's copy current after the browser rotates or drops the subscription.
    // On a host with no provider the wait never ends, and there is nothing to refresh.
    if (registry.get(settingsAtom).notifications) {
      const refresh = yield* Capability.waitFor(AppCapabilities.PushProvider).pipe(
        Effect.flatMap(() => Effect.promise(() => registration.refresh())),
        Effect.forkDetach,
      );
      yield* Effect.addFinalizer(() => Fiber.interrupt(refresh));
    }

    return Capability.contribute(MessengerCapabilities.PushNotifications, {
      status,
      enable: async () => {
        const outcome = await registration.enable();
        setOptedIn(outcome === 'on');
        return outcome;
      },
      disable: async () => {
        const outcome = await registration.disable();
        setOptedIn(false);
        return outcome;
      },
    });
  }),
);
