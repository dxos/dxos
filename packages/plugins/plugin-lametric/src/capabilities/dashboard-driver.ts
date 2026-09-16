//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Atom from 'effect/unstable/reactivity/Atom';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { log } from '@dxos/log';
import { toMetrics } from '@dxos/plugin-space/dashboard';
import * as SpaceCapabilities from '@dxos/plugin-space/SpaceCapabilities';

import * as LaMetric from '#protocol';
import { toFrames } from '#render';
import { type LaMetricTransport, discoverWidgetId, selectTransport, tauriFetch } from '#transport';
import { LaMetricCapabilities } from '#types';

import { Pusher } from './pusher.ts';

/** Matches the settings default; used when the stored value predates the field. */
const DEFAULT_MIN_INTERVAL_MS = 5_000;

/**
 * Keeps the device showing the active space.
 *
 * Headless, like the Stream Deck driver: the display must stay live whether or not a panel is on
 * screen. It costs nothing when the device is unconfigured — no transport is built, so no request is
 * ever made, which is the common case since most users have no LaMetric.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const registry = yield* Capability.get(Capabilities.AtomRegistry);
    const dashboard = yield* Capability.get(SpaceCapabilities.Dashboard);
    const settings = yield* Capability.get(LaMetricCapabilities.SettingsAtom);

    const status = Atom.make<LaMetricCapabilities.PushStatus>({ state: 'idle' }).pipe(Atom.keepAlive);
    let pusher: Pusher | undefined;
    let unsubscribeDashboard: (() => void) | undefined;
    let generation = 0;

    // The address decides which transport is used, so a settings change rebuilds rather than mutates.
    const rebuild = () => {
      const current = ++generation;
      pusher?.close();
      pusher = undefined;
      unsubscribeDashboard?.();
      unsubscribeDashboard = undefined;
      const config = registry.get(settings);

      const build = (widgetId: string | undefined) => {
        if (current !== generation) {
          return;
        }
        const transport: LaMetricTransport | undefined = widgetId
          ? selectTransport({ ...config, widgetId }, tauriFetch)
          : undefined;
        if (!transport) {
          // An unconfigured device is not a failure, so the indicator stays silent.
          registry.set(status, { state: 'idle' });
          return;
        }
        pusher = new Pusher({
          transport,
          minIntervalMs: config.minPushIntervalMs ?? DEFAULT_MIN_INTERVAL_MS,
          onStatus: (next) => registry.set(status, next),
        });
        unsubscribeDashboard = registry.subscribe(
          dashboard,
          ({ stats, tasks }) =>
            // MAX_FRAMES is this device's geometry, which is why the slot count is applied here rather
            // than in the space's projection.
            pusher?.send({ frames: toFrames(toMetrics(tasks, stats, LaMetric.MAX_FRAMES)) }),
          { immediate: true },
        );
      };

      // The DIY widget's UUID identifies one installation of the stock app and appears nowhere in
      // LaMetric's UI, so it has to come off the device unless the user has overridden it.
      if (config.widgetId) {
        build(config.widgetId);
      } else {
        void discoverWidgetId(config, tauriFetch)
          .then(build)
          .catch((error) => {
            if (current !== generation) {
              return;
            }
            log('lametric could not read the device app list', { error });
            registry.set(status, { state: 'idle' });
          });
      }
    };

    const unsubscribeSettings = registry.subscribe(settings, rebuild);
    rebuild();

    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        generation++;
        unsubscribeSettings();
        unsubscribeDashboard?.();
        pusher?.close();
      }),
    );

    return [Capability.contribute(LaMetricCapabilities.PushStatus, status)];
  }),
);
