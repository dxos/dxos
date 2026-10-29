//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Atom from 'effect/reactivity/Atom';
import * as Schema from 'effect/Schema';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import type * as AppPush from '@dxos/app-toolkit/AppPush';
import { Context } from '@dxos/context';
import * as KvsStore from '@dxos/effect/KvsStore';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';

import { meta } from '#meta';
import { makePushRegistration, makePushSenders } from '#push';

/** The user's choice for this device; per device because each browser holds its own push subscription. */
const OptIn = Schema.Struct({ enabled: Schema.Boolean });

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const client = yield* ClientCapabilities.Client;
    const registry = yield* Capabilities.AtomRegistry;
    // Optional, and read live rather than once: only platforms with a push service contribute one, and plugin-pwa
    // does so on Idle, which can come after this module's activation on SpacesAvailable.
    const providers = yield* Capability.contributions(AppCapabilities.PushProvider);

    const optIn = KvsStore.make({
      key: `${meta.profile.key}.push`,
      schema: OptIn,
      defaultValue: () => ({ enabled: false }),
    });
    const enabled = Atom.make((get) => get(optIn).enabled).pipe(Atom.keepAlive);

    // The outcome of the last attempt; until there is one, the status follows whether a provider is here yet.
    const result = Atom.make<AppPush.Status | undefined>(undefined).pipe(Atom.keepAlive);
    const error = Atom.make<string | undefined>(undefined).pipe(Atom.keepAlive);
    const status = Atom.make(
      (get): AppPush.Status => get(result) ?? (get(providers.atom)[0]?.supported ? 'off' : 'unsupported'),
    ).pipe(Atom.keepAlive);

    const ctx = Context.default();
    const registration = makePushRegistration({
      provider: () => providers.get()[0],
      edge: {
        getVapidPublicKey: () => client.edge.http.getVapidPublicKey(ctx),
        putPushSubscription: (subscription) => client.edge.http.putPushSubscription(ctx, subscription),
        deletePushSubscription: (endpoint) => client.edge.http.deletePushSubscription(ctx, endpoint),
      },
      setStatus: (next, failure) => {
        registry.set(result, next);
        registry.set(error, failure);
      },
      setEnabled: (next) => registry.set(optIn, { enabled: next }),
    });

    // EDGE pushes only notices from the senders it holds for this identity: the contacts this device sees (members
    // of the spaces it shares) and the identity itself. Kept current only while push is on here.
    const senders = makePushSenders({
      senders: () => {
        const self = client.halo.identity.get()?.did;
        const contacts = client.halo.contacts.get().flatMap((contact) => (contact.did ? [contact.did] : []));
        return self ? [self, ...contacts] : contacts;
      },
      put: (list) => client.edge.http.putPushSenders(ctx, { senders: [...list] }),
    });
    const syncSenders = () => {
      if (registry.get(enabled)) {
        senders.sync();
      }
    };
    // `client.halo` is replaced when the services reconnect, so the subscriptions follow it.
    let unwatchHalo = () => {};
    const watchHalo = () => {
      unwatchHalo();
      const subscriptions = [client.halo.contacts.subscribe(syncSenders), client.halo.identity.subscribe(syncSenders)];
      unwatchHalo = () => subscriptions.forEach((subscription) => subscription.unsubscribe());
      syncSenders();
    };
    watchHalo();
    const unwatchReloaded = client.reloaded.on(watchHalo);
    const unwatchEnabled = registry.subscribe(enabled, syncSenders);
    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        unwatchEnabled();
        unwatchReloaded();
        unwatchHalo();
      }),
    );

    // Re-registering on every start keeps EDGE's copy current after the browser rotates or drops the subscription,
    // and finishes a registration the user quit before it completed. With no provider the wait never ends.
    if (registry.get(optIn).enabled) {
      const refresh = yield* Capability.waitFor(AppCapabilities.PushProvider).pipe(
        Effect.flatMap(() => Effect.promise(() => registration.refresh())),
        Effect.forkDetach,
      );
      yield* Effect.addFinalizer(() => Fiber.interrupt(refresh));
    }

    return Capability.contribute(AppCapabilities.PushNotifications, {
      status,
      error,
      enabled,
      enable: registration.enable,
      disable: registration.disable,
      sendTest: registration.sendTest,
    });
  }),
);
