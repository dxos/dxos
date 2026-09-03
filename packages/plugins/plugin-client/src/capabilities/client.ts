//
// Copyright 2025 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Layer from 'effect/Layer';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import { Client, ClientService, fromClient } from '@dxos/client';
import { INITIALIZE_TIMEOUT } from '@dxos/client-protocol';
import { EffectEx } from '@dxos/effect';
import { makeIdentityService, makeSpaceService } from '@dxos/halo-adapter-client';
import { log } from '@dxos/log';

import { ClientCapabilities, ClientEvents, ClientOptions } from '#types';

type ClientCapabilityOptions = Omit<
  ClientOptions.ClientPluginOptions,
  'appKey' | 'shareableLinkOrigin' | 'invitationPath' | 'invitationParam' | 'onReset'
>;

export default Capability.makeModule(
  Effect.fnUntraced(function* ({
    client: hostClient,
    onClientInitialized,
    onClientInitializationError,
    onSpacesReady,
    initializeTimeout = INITIALIZE_TIMEOUT,
    awaitInitialization = false,
    ...options
  }: ClientCapabilityOptions) {
    const capabilityManager = yield* Capability.Service;
    const pluginManager = yield* Plugin.Service;

    log(hostClient ? 'adopting host client' : 'creating client');
    const client = hostClient ?? new Client(options);
    if (!hostClient) {
      // A host-supplied client marked this where it began initializing, which is the span.
      performance.mark('milestone:client-initialize:start');
    }
    log('initializing client (forked)...');

    let subscription: { unsubscribe: () => void } | undefined;

    // Registered BEFORE the fork so it runs AFTER the fiber's interrupt — scope finalizers run in
    // reverse order of addition, so the in-flight initialization stops before the client it is
    // initializing goes away.
    yield* Effect.addFinalizer(() =>
      Effect.gen(function* () {
        log.info('client capability: destroying client');
        subscription?.unsubscribe();
        yield* Effect.tryPromise(() => client.destroy()).pipe(
          // A finalizer must not fail, and a teardown error must not mask the reason for teardown.
          Effect.catch((error) => Effect.sync(() => log.warn('client destroy failed', { error: String(error) }))),
        );
      }),
    );

    // Forked off the startup pass: the (uninitialized) client capability is contributed
    // immediately and startup completes without waiting; React consumers suspend via
    // `useClient` and imperative consumers ride `ClientEvents.Initialized` or
    // `client.waitUntilInitialized()`. Everything touching `client.halo`/`client.services`/
    // `client.spaces` (initialized-only getters) lives in this continuation.
    yield* Effect.gen(function* () {
      // Bounded so a handshake that never completes becomes a failure the app can surface,
      // rather than leaving every suspended consumer waiting on a promise that never settles.
      yield* Effect.tryPromise(() => client.initialize()).pipe(Effect.timeout(initializeTimeout));
      performance.mark('milestone:client-initialize:end');
      log('client.initialize() returned successfully');
      if (onClientInitialized) {
        yield* onClientInitialized({ client });
      }
      performance.mark('milestone:client-initialized-callback:end');
      log('called client initialized callback');

      yield* Plugin.activate(ClientEvents.Initialized);

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
      subscription = client.spaces.subscribe(async () => {
        if (!spacesReadyFired) {
          spacesReadyFired = true;
          // Boot-waterfall milestone: ECHO spaces observable from here (both entry paths).
          performance.mark('milestone:spaces-ready');
          const exit = await Effect.gen(function* () {
            yield* Plugin.activate(ClientEvents.SpacesReady);
            if (onSpacesReady) {
              yield* onSpacesReady({ client });
            }
          }).pipe(
            Effect.provideService(Capability.Service, capabilityManager),
            Effect.provideService(Plugin.Service, pluginManager),
            Effect.runPromiseExit,
          );
          // Shutting the manager down mid-activation interrupts this fiber, which is the subscription
          // ending rather than a failure — and rethrowing it from this floating promise surfaces as an
          // unhandled rejection. Real failures still propagate.
          if (Exit.isFailure(exit) && !Cause.hasInterruptsOnly(exit.cause)) {
            EffectEx.throwCause(exit.cause);
          }
        }
      });
    }).pipe(
      // A failed client init is fatal to the session: every dependent surface stays suspended.
      // The fork is outside the render tree, so the app has to be told — React never sees it.
      Effect.catch((error) =>
        Effect.gen(function* () {
          log.error('client initialization failed', { error: String(error) });
          if (onClientInitializationError) {
            yield* onClientInitializationError({ error });
          }
        }),
      ),
      Effect.provideService(Capability.Service, capabilityManager),
      Effect.provideService(Plugin.Service, pluginManager),
      // Scoped, not daemon: the module's scope closes on deactivation (and on manager shutdown),
      // so an initialization still in flight is interrupted instead of outliving the capability
      // and contributing to a torn-down manager.
      Effect.forkScoped,
    );

    log('client capability ready (initialization in flight)');

    // `waitUntilInitialized` is the completion signal only — a failed `initialize()` rejects at its
    // own call site and leaves this pending forever, so the wait is bounded by the same budget.
    const clientServiceLayer = awaitInitialization
      ? Layer.effect(
          ClientService,
          Effect.tryPromise({
            try: () => client.waitUntilInitialized({ timeout: initializeTimeout }),
            catch: (error) => new Error(`Client failed to initialize within ${initializeTimeout}ms: ${String(error)}`),
          }).pipe(Effect.as(client)),
        )
      : fromClient(client);

    return [
      // TODO(wittjosiah): Try to remove and prefer layer?
      //  Perhaps move to using layer has source of truth and add a getter capability for the client.
      Capability.contribute(ClientCapabilities.Client, client),
      Capability.contribute(ClientCapabilities.InitializeTimeout, initializeTimeout),
      Capability.contribute(Capabilities.Layer, clientServiceLayer),
      // HALO service instances for imperative consumers (so plugins read identity/spaces
      // through @dxos/halo instead of the client directly).
      Capability.contribute(ClientCapabilities.IdentityService, makeIdentityService(client)),
      Capability.contribute(ClientCapabilities.SpaceService, makeSpaceService(client)),
    ];
  }),
);
