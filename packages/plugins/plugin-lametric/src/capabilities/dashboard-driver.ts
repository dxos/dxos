//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Atom from 'effect/unstable/reactivity/Atom';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { toMetrics } from '@dxos/plugin-space/dashboard';
import * as SpaceCapabilities from '@dxos/plugin-space/SpaceCapabilities';

import * as LaMetric from '#protocol';
import { toFrames } from '#render';
import { type LaMetricTransport, selectTransport, tauriFetch } from '#transport';
import { LaMetricCapabilities } from '#types';

import { Pusher } from './pusher';

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

    const publish = () => {
      if (!pusher) {
        return;
      }
      const { stats, tasks } = registry.get(dashboard);
      // MAX_FRAMES is this device's geometry, which is why the slot count is applied here rather
      // than in the space's projection.
      pusher.send({ frames: toFrames(toMetrics(tasks, stats, LaMetric.MAX_FRAMES)) });
    };

    // The address decides which transport is used, so a settings change rebuilds rather than mutates.
    const rebuild = () => {
      pusher?.close();
      const config = registry.get(settings);
      const transport: LaMetricTransport | undefined = selectTransport(config, tauriFetch);
      if (transport) {
        pusher = new Pusher({
          transport,
          minIntervalMs: config.minPushIntervalMs ?? DEFAULT_MIN_INTERVAL_MS,
          onStatus: (next) => registry.set(status, next),
        });
      } else {
        pusher = undefined;
        // An unconfigured device is not a failure, so the indicator stays silent.
        registry.set(status, { state: 'idle' });
      }
      publish();
    };

    const unsubscribe = [registry.subscribe(settings, rebuild), registry.subscribe(dashboard, publish)];
    rebuild();

    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        unsubscribe.forEach((fn) => fn());
        pusher?.close();
      }),
    );

    return [Capability.contribute(LaMetricCapabilities.PushStatus, status)];
  }),
);
