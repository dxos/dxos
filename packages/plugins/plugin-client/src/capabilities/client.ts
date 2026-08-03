//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability, Plugin } from '@dxos/app-framework';
import { Client, ClientService } from '@dxos/client';
import { EffectEx } from '@dxos/effect';
import { makeIdentityService, makeSpaceService } from '@dxos/halo-adapter-client';
import { log } from '@dxos/log';

import { ClientEvents } from '#types';
import { ClientCapabilities, type ClientPluginOptions } from '#types';

type ClientCapabilityOptions = Omit<
  ClientPluginOptions,
  'appKey' | 'shareableLinkOrigin' | 'invitationPath' | 'invitationParam' | 'onReset'
>;

export default Capability.makeModule(
  Effect.fnUntraced(function* ({ onClientInitialized, onSpacesReady, ...options }: ClientCapabilityOptions) {
    const capabilityManager = yield* Capability.Service;
    const pluginManager = yield* Plugin.Service;

    log('creating client');
    const client = new Client(options);
    log('initializing client (calling client.initialize())...');
    yield* Effect.tryPromise(() => client.initialize());
    log('client.initialize() returned successfully');
    if (onClientInitialized) {
      yield* onClientInitialized({ client }).pipe(
        Effect.provideService(Capability.Service, capabilityManager),
        Effect.provideService(Plugin.Service, pluginManager),
      );
    }
    log('called client initialized callback');

    // TODO(wittjosiah): Remove. This is a hack to get the app to boot with the new identity after a reset.
    client.reloaded.on(() => {
      client.halo.identity.subscribe(async (identity) => {
        if (identity) {
          window.location.href = window.location.origin;
        }
      });
    });

    // Interim fix: when a guest tab reconnects to a newly-elected leader worker (e.g. after the
    // previous leader tab closes), its proxies are left in a broken state. Force a full reload to
    // re-establish a clean session until the reconnect flow can recover in place.
    // TODO(dmaretskyi): Remove once guest tabs recover from a leader handover without reloading.
    //
    // `client.reset()` also fires this event (its teardown reconnects this tab to a fresh worker),
    // and reset must reload too, but to a different URL. `reload()` re-requests the *current* URL
    // (path included); after a reset the current route (e.g. the Devices settings panel where reset
    // was triggered) points at now-deleted data, so reopening it shows stale/broken UI. Navigating
    // to `origin` instead drops the path and boots the app fresh — which is also what the app's own
    // post-reset flow targets. The two branches differ only when the path isn't already `/`; a
    // normal reconnect keeps the user where they were, a reset returns them to the root.
    client.services.reconnected?.on(() => {
      log.info('client reconnected, reloading to re-establish session');
      if (client.resetting) {
        window.location.href = window.location.origin;
      } else {
        window.location.reload();
      }
    });

    let spacesReadyFired = false;
    const subscription = client.spaces.subscribe(async () => {
      if (!spacesReadyFired) {
        spacesReadyFired = true;
        await Effect.gen(function* () {
          yield* Plugin.activate(ClientEvents.SpacesReady);
          if (onSpacesReady) {
            yield* onSpacesReady({ client });
          }
        }).pipe(
          Effect.provideService(Capability.Service, capabilityManager),
          Effect.provideService(Plugin.Service, pluginManager),
          EffectEx.runAndForwardErrors,
        );
      }
    });

    log('client capability ready');

    return [
      // TODO(wittjosiah): Try to remove and prefer layer?
      //  Perhaps move to using layer has source of truth and add a getter capability for the client.
      Capability.contributes(ClientCapabilities.Client, client, () =>
        Effect.gen(function* () {
          log.info('client capability: destroying client');
          // TODO(dmaretskyi): use scope for destroy.
          subscription.unsubscribe();
          yield* Effect.tryPromise(() => client.destroy());
        }),
      ),
      Capability.contributes(Capabilities.Layer, ClientService.fromClient(client)),
      // HALO service instances for imperative consumers (so plugins read identity/spaces
      // through @dxos/halo instead of the client directly).
      Capability.contributes(ClientCapabilities.IdentityService, makeIdentityService(client)),
      Capability.contributes(ClientCapabilities.SpaceService, makeSpaceService(client)),
    ];
  }),
);
