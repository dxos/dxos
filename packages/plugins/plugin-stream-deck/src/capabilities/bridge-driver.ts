//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Atom from 'effect/unstable/reactivity/Atom';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { log } from '@dxos/log';
import { type SpaceDashboard, toMetrics, toSlots } from '@dxos/plugin-space/dashboard';
import * as SpaceCapabilities from '@dxos/plugin-space/SpaceCapabilities';
import { getIconRegistry } from '@dxos/react-ui';
import { isTauri } from '@dxos/util';

import { StreamDeckBridge } from '#bridge';
import * as Protocol from '#protocol';
import { type IconMarkup, buildFrame, resolveIcon } from '#render';
import { StreamDeckCapabilities } from '#types';

const DEVICE = Protocol.streamDeckPlus;

/** Brings the window forward, so the object a key opened is actually visible. */
const focusWindow = async (): Promise<void> => {
  if (!isTauri()) {
    return;
  }
  const { getCurrentWindow } = await import('@tauri-apps/api/window');
  const window = getCurrentWindow();
  await window.show();
  await window.setFocus();
};

/**
 * Owns the one connection to the device plugin and keeps it showing the active space.
 *
 * Headless on purpose: the keys must stay live whether or not the dashboard panel is on screen, and
 * the device accepts a single client — so this is the only thing that opens a bridge, and surfaces
 * read {@link StreamDeckCapabilities.BridgeStatus} rather than connecting themselves.
 *
 * The space itself is projected by `plugin-space`'s dashboard capability; this only maps those facts
 * onto Stream Deck geometry and pushes them.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const registry = yield* Capability.get(Capabilities.AtomRegistry);
    const { invokePromise } = yield* Capability.get(Capabilities.OperationInvoker);
    const dashboard = yield* Capability.get(SpaceCapabilities.Dashboard);

    const status = Atom.make<StreamDeckCapabilities.BridgeStatus>({ state: 'idle' }).pipe(Atom.keepAlive);

    // Targets of the frame currently on the device, so a press resolves against what the key shows
    // rather than a re-query that may have moved on.
    let targets: (string | undefined)[] = [];

    let unsubscribeDashboard: (() => void) | undefined;
    let current: SpaceDashboard | undefined;

    const publish = () => {
      if (!current) {
        return;
      }
      const { stats, tasks, favorites } = current;
      const keys = toSlots(favorites, DEVICE.keys);
      const icons: Record<string, IconMarkup> = {};
      for (const key of keys) {
        // Undefined until the sprite has the glyph; the icon-registry subscription republishes then.
        const icon = key && resolveIcon(key.icon);
        if (key && icon) {
          icons[key.icon] = icon;
        }
      }

      const frame = buildFrame({
        device: DEVICE,
        keys,
        dials: toMetrics(tasks, stats, DEVICE.dials),
        icons,
      });

      targets = frame.keys.map((key) => key?.target);
      bridge.publish(frame);
    };

    const bridge = new StreamDeckBridge({
      onStateChange: (state) => {
        registry.set(status, { state, device: bridge.device });
        if (state !== 'connected') {
          unsubscribeDashboard?.();
          unsubscribeDashboard = undefined;
          current = undefined;
        }
      },
      onHello: (device) => {
        registry.set(status, { state: 'connected', device });
        unsubscribeDashboard?.();
        // Frames are dropped while disconnected, so a fresh connection needs the current one resent.
        unsubscribeDashboard = registry.subscribe(
          dashboard,
          (next) => {
            current = next;
            publish();
          },
          { immediate: true },
        );
      },
      onInput: (input) => {
        // Dial bindings are undecided. The events are transported anyway, so binding them later needs
        // no protocol change.
        if (input.kind !== 'keyDown') {
          return;
        }
        const target = targets[input.slot];
        if (!target) {
          return;
        }
        void invokePromise(LayoutOperation.Open, { subject: [target] })
          .then(focusWindow)
          .catch((error) => log.warn('stream deck could not open the pressed object', { target, error }));
      },
    });

    const unsubscribeIcons = getIconRegistry().subscribe(publish);

    bridge.open();

    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        unsubscribeIcons();
        unsubscribeDashboard?.();
        bridge.close();
      }),
    );

    return [Capability.contribute(StreamDeckCapabilities.BridgeStatus, status)];
  }),
);
