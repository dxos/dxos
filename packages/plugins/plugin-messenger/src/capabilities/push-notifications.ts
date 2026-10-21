//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
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
    // Optional: only platforms with a push service contribute one (plugin-pwa on the web).
    const provider = Option.getOrUndefined(yield* Capability.getOption(AppCapabilities.PushProvider));

    const status = Atom.make<MessengerCapabilities.PushStatus>(provider?.supported ? 'off' : 'unsupported').pipe(
      Atom.keepAlive,
    );
    const ctx = Context.default();
    const registration = makePushRegistration({
      provider,
      edge: {
        getVapidPublicKey: () => client.edge.http.getVapidPublicKey(ctx),
        putPushSubscription: (subscription) => client.edge.http.putPushSubscription(ctx, subscription),
        deletePushSubscription: (endpoint) => client.edge.http.deletePushSubscription(ctx, endpoint),
      },
      setStatus: (next) => registry.set(status, next),
    });

    const setOptedIn = (notifications: boolean) =>
      registry.set(settingsAtom, { ...registry.get(settingsAtom), notifications });

    // Re-registering on every start keeps EDGE's copy current after the browser rotates or drops the subscription.
    if (registry.get(settingsAtom).notifications) {
      void registration.refresh();
    }

    return Capability.contribute(MessengerCapabilities.PushNotifications, {
      status,
      enable: async () => {
        const result = await registration.enable();
        setOptedIn(result === 'on');
        return result;
      },
      disable: async () => {
        const result = await registration.disable();
        setOptedIn(false);
        return result;
      },
    });
  }),
);
