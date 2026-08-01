//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as PubSub from 'effect/PubSub';
import * as Queue from 'effect/Queue';

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import { DXN } from '@dxos/keys';
import { log } from '@dxos/log';

const meta = Plugin.makeMeta({
  key: DXN.make('org.dxos.plugin.afterStartup'),
  name: 'After Startup',
  description: 'Fires the DeferredStartup activation event at host idle once startup completes.',
  tags: ['system'],
});

/** Resolves at host idle (`requestIdleCallback` when available, macrotask fallback). */
const idle = (): Promise<void> =>
  new Promise((resolve) => {
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(() => resolve(), { timeout: 2_000 });
    } else {
      setTimeout(resolve, 0);
    }
  });

const FireDeferredStartup = Capability.inlineModule('FireDeferredStartup', { provides: [] }, () =>
  Effect.gen(function* () {
    const manager = yield* Plugin.Service;
    // Daemon: this module activates during the startup pass, long before the ready signal
    // it waits for; the deferred wave must also outlive the activation call itself.
    yield* Effect.gen(function* () {
      yield* Effect.scoped(
        Effect.gen(function* () {
          const subscription = yield* PubSub.subscribe(manager.activation);
          for (;;) {
            const message = yield* Queue.take(subscription);
            // The event-level Startup message (no `module` field) is the app-ready signal.
            if (message.event === ActivationEvents.Startup.id && message.state === 'activated' && !message.module) {
              return;
            }
          }
        }),
      );
      // Idle, so the deferred modules' loading never competes with the ready-path render.
      yield* Effect.promise(idle);
      yield* manager.activate(ActivationEvents.DeferredStartup);
    }).pipe(
      Effect.catchAll((error) =>
        Effect.sync(() => log.error('deferred-startup dispatch failed', { error: String(error) })),
      ),
      Effect.forkDaemon,
    );
    return [];
  }),
);

export const AfterStartupPlugin = Plugin.define(meta).pipe(Plugin.addModule(FireDeferredStartup), Plugin.make);

export default AfterStartupPlugin;
