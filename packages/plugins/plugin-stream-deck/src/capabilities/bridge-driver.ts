//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Atom from 'effect/unstable/reactivity/Atom';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppSpace from '@dxos/app-toolkit/AppSpace';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { type Space } from '@dxos/client/echo';
import { Filter, type Filter as FilterType, Obj, Query, Tag } from '@dxos/echo';
import { log } from '@dxos/log';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import { getIconRegistry } from '@dxos/react-ui';
import { isTauri } from '@dxos/util';

import { StreamDeckBridge } from '#bridge';
import { findFavoriteTag, toDialSpecs, toKeySpecs, toSpaceStats } from '#model';
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

/** A live query bundled with its teardown, so switching space drops every subscription it made. */
type Subscription = {
  readonly results: readonly Obj.Unknown[];
  readonly close: () => void;
};

const subscribe = (space: Space, filter: FilterType.Any, onChange: () => void): Subscription => {
  const query = space.db.query(Query.select(filter));
  const close = query.subscribe(onChange);
  return {
    get results() {
      return query.results as readonly Obj.Unknown[];
    },
    close,
  };
};

/**
 * Owns the one connection to the device plugin and keeps it showing the active space.
 *
 * Headless on purpose: the keys must stay live whether or not the dashboard panel is on screen, and
 * the device accepts a single client — so this is the only thing that opens a bridge, and surfaces
 * read {@link StreamDeckCapabilities.BridgeStatus} rather than connecting themselves.
 *
 * Costs almost nothing when no device plugin is installed, which is the common case: the connection
 * fails, the bridge backs off to a 30s retry, and the queries below only exist while a space is
 * active.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const registry = yield* Capability.get(Capabilities.AtomRegistry);
    const capabilityManager = yield* Capability.Service;
    const { invokePromise } = yield* Capability.get(Capabilities.OperationInvoker);
    const client = yield* Capability.get(ClientCapabilities.Client);
    const pluginManager = yield* Capability.get(Capabilities.PluginManager);

    const status = Atom.make<StreamDeckCapabilities.BridgeStatus>({ state: 'idle' }).pipe(Atom.keepAlive);
    const contributions = [Capability.contribute(StreamDeckCapabilities.BridgeStatus, status)];

    // Without a layout there is no active space to project, so there is nothing to drive; the status
    // is still contributed so surfaces have something to read.
    const [layout] = capabilityManager.getAll(AppCapabilities.Layout);
    if (!layout) {
      return contributions;
    }

    // Targets of the frame currently on the device, so a press resolves against what the key shows
    // rather than a re-query that may have moved on.
    let targets: (string | undefined)[] = [];

    const bridge = new StreamDeckBridge({
      onStateChange: (state) => registry.set(status, { state, device: bridge.device }),
      onHello: (device) => registry.set(status, { state: 'connected', device }),
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

    let space: Space | undefined;
    let everything: Subscription | undefined;
    let tags: Subscription | undefined;
    let favorites: Subscription | undefined;
    let favoriteTag: string | undefined;

    const publish = () => {
      const keys = toKeySpecs(favorites?.results ?? [], DEVICE.keys);
      const icons: Record<string, IconMarkup> = {};
      for (const key of keys) {
        // Undefined until the sprite has the glyph; the icon-registry subscription republishes then.
        const icon = key && resolveIcon(key.icon);
        if (key && icon) {
          icons[key.icon] = icon;
        }
      }

      const progress = capabilityManager.getAll(AppCapabilities.ProgressRegistry)[0];
      const stats = toSpaceStats(everything?.results ?? [], registry.get(pluginManager.enabled).length);
      const frame = buildFrame({
        device: DEVICE,
        keys,
        dials: toDialSpecs(progress ? registry.get(progress.snapshotAtom).tasks : [], stats, DEVICE.dials),
        icons,
      });

      targets = frame.keys.map((key) => key?.target);
      bridge.publish(frame);
    };

    // The favorite tag is an ordinary object, so it can appear after the space opens and can be
    // deleted while it is open; rebind whenever its identity changes.
    const rebindFavorites = () => {
      const tag = findFavoriteTag((tags?.results ?? []) as Tag.Tag[]);
      const uri = tag && Obj.getURI(tag);
      if (uri === favoriteTag) {
        return;
      }
      favorites?.close();
      favoriteTag = uri;
      favorites = space && uri ? subscribe(space, Filter.tag(uri), publish) : undefined;
    };

    const closeSpace = () => {
      favorites?.close();
      tags?.close();
      everything?.close();
      favorites = tags = everything = undefined;
      favoriteTag = undefined;
    };

    const openSpace = (next: Space | undefined) => {
      if (next === space) {
        return;
      }
      closeSpace();
      space = next;
      if (space) {
        everything = subscribe(space, Filter.everything(), publish);
        tags = subscribe(space, Filter.type(Tag.Tag), () => {
          rebindFavorites();
          publish();
        });
        rebindFavorites();
      }
      publish();
    };

    const unsubscribe = [
      registry.subscribe(layout, () => openSpace(AppSpace.getActiveSpace(client, capabilityManager))),
      registry.subscribe(pluginManager.enabled, publish),
      // Icons resolve asynchronously out of the sprite, so a key can be published without its glyph
      // and needs republishing once the symbol lands.
      getIconRegistry().subscribe(publish),
    ];

    const progress = capabilityManager.getAll(AppCapabilities.ProgressRegistry)[0];
    if (progress) {
      unsubscribe.push(registry.subscribe(progress.snapshotAtom, publish));
    }

    bridge.open();
    openSpace(AppSpace.getActiveSpace(client, capabilityManager));

    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        unsubscribe.forEach((fn) => fn());
        closeSpace();
        bridge.close();
      }),
    );

    return contributions;
  }),
);
