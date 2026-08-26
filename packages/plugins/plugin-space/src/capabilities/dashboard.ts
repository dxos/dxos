//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Atom from 'effect/unstable/reactivity/Atom';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppSpace from '@dxos/app-toolkit/AppSpace';
import { type Space } from '@dxos/client/echo';
import { Filter, type Filter as FilterType, Obj, Query, Tag } from '@dxos/echo';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';

import { type SpaceDashboard, findFavoriteTag, toShortcuts, toSpaceStats } from '#dashboard';
import { SpaceCapabilities } from '#types';

/** Enough favorites for any peripheral we drive; each device takes the prefix it can show. */
const MAX_SHORTCUTS = 16;

const EMPTY: SpaceDashboard = {
  stats: { objects: 0, feeds: 0, types: 0, plugins: 0 },
  tasks: [],
  favorites: [],
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
 * Projects the active space for peripheral displays, and owns the queries behind that projection.
 *
 * Centralised here so N attached devices cost one `Filter.everything()` rather than N. The atom
 * carries facts only — how many slots exist and how a slot is drawn belong to the device plugin.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const registry = yield* Capability.get(Capabilities.AtomRegistry);
    const capabilityManager = yield* Capability.Service;
    const client = yield* Capability.get(ClientCapabilities.Client);
    const pluginManager = yield* Capability.get(Capabilities.PluginManager);

    const dashboard = Atom.make<SpaceDashboard>(EMPTY).pipe(Atom.keepAlive);
    const contributions = [Capability.contribute(SpaceCapabilities.Dashboard, dashboard)];

    // Without a layout there is no active space to project. The atom is still contributed so
    // consumers always have something to read rather than having to handle its absence.
    const [layout] = capabilityManager.getAll(AppCapabilities.Layout);
    if (!layout) {
      return contributions;
    }

    let space: Space | undefined;
    let everything: Subscription | undefined;
    let tags: Subscription | undefined;
    let favorites: Subscription | undefined;
    let favoriteTag: string | undefined;

    const publish = () => {
      const progress = capabilityManager.getAll(AppCapabilities.ProgressRegistry)[0];
      registry.set(dashboard, {
        stats: toSpaceStats(everything?.results ?? [], registry.get(pluginManager.enabled).length),
        tasks: progress ? registry.get(progress.snapshotAtom).tasks : [],
        favorites: toShortcuts(favorites?.results ?? [], MAX_SHORTCUTS).filter((entry) => entry !== null),
      });
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
    ];

    const progress = capabilityManager.getAll(AppCapabilities.ProgressRegistry)[0];
    if (progress) {
      unsubscribe.push(registry.subscribe(progress.snapshotAtom, publish));
    }

    openSpace(AppSpace.getActiveSpace(client, capabilityManager));

    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        unsubscribe.forEach((fn) => fn());
        closeSpace();
      }),
    );

    return contributions;
  }),
);
