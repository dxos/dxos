//
// Copyright 2026 DXOS.org
//

import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as PubSub from 'effect/PubSub';
import * as Queue from 'effect/Queue';

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { DXN } from '@dxos/keys';
import { log } from '@dxos/log';

const meta = Plugin.makeMeta({
  key: DXN.make('org.dxos.plugin.afterStartup'),
  name: 'After Startup',
  description: 'Fires the app-wide start events at host idle once startup completes.',
  tags: ['system'],
});

const FIRST_INTERACTIVE_MARK = 'app-framework:first-interactive';

/**
 * The start events that are app-wide rather than per-feature, so no surface can gate them:
 * graph builders populate the navtree, and an item must exist there before it can be opened.
 * Every other plugin's start event is fired by its own surface rendering (see the module loader).
 */
const APP_WIDE_START_EVENTS = [AppCapability.GraphStart];

/**
 * Resolves at host idle (`requestIdleCallback` when available, macrotask fallback). The long
 * timeout is a stall backstop only: an aggressive timeout fires mid-render of the ready UI and
 * the start-event waves then flood the main thread ahead of first paint of the workspace.
 */
const idle: Effect.Effect<void> = Effect.async<void>((resume) => {
  if (typeof requestIdleCallback === 'function') {
    const handle = requestIdleCallback(() => resume(Effect.void), { timeout: 15_000 });
    return Effect.sync(() => cancelIdleCallback(handle));
  }
  const handle = setTimeout(() => resume(Effect.void), 0);
  return Effect.sync(() => clearTimeout(handle));
});

/**
 * Bounded wait for the app shell's first paint: the ready message precedes the shell render,
 * and `requestIdleCallback` can find an idle gap mid-render-pipeline — firing there floods the
 * main thread with the deferred wave ahead of the workspace paint.
 */
const awaitPaint: Effect.Effect<void> = Effect.gen(function* () {
  for (let i = 0; i < 100 && performance.getEntriesByName(FIRST_INTERACTIVE_MARK).length === 0; i++) {
    yield* Effect.sleep(Duration.millis(100));
  }
});

const FireAppWideStartEvents = Capability.inlineModule('FireAppWideStartEvents', { provides: [] }, () =>
  Effect.gen(function* () {
    const manager = yield* Plugin.Service;
    // Daemon: this module activates during the startup pass, long before the ready signal
    // it waits for; the start-event dispatch must also outlive the activation call itself.
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
      yield* awaitPaint;
      yield* idle;
      // Sequential so the post-ready background load never saturates the main thread in one
      // burst; per-event failures are logged and skipped so one broken wave cannot stall the rest.
      yield* Effect.forEach(
        APP_WIDE_START_EVENTS,
        (event) =>
          manager
            .activate(event)
            .pipe(
              Effect.catchAll((error) =>
                Effect.sync(() => log.warn('start event failed', { event: event.id, error: String(error) })),
              ),
            ),
        { discard: true },
      );
    }).pipe(
      Effect.catchAll((error) =>
        Effect.sync(() => log.error('plugin start dispatch failed', { error: String(error) })),
      ),
      Effect.forkDaemon,
    );
    return [];
  }),
);

export const AfterStartupPlugin = Plugin.define(meta).pipe(Plugin.addModule(FireAppWideStartEvents), Plugin.make);

export default AfterStartupPlugin;
