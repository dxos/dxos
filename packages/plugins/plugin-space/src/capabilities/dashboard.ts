//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Atom from 'effect/unstable/reactivity/Atom';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppSpace from '@dxos/app-toolkit/AppSpace';
import { Filter, Obj, Tag } from '@dxos/echo';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as ClientEvents from '@dxos/plugin-client/ClientEvents';

import { SPACE_STATS_QUERY, type SpaceDashboard, findFavoriteTag, toShortcuts, toSpaceStats } from '#dashboard';
import { SpaceCapabilities } from '#types';

/** Enough favorites for any peripheral we drive; each device takes the prefix it can show. */
const MAX_SHORTCUTS = 16;

/** Projects the active space for peripheral displays, and owns the queries behind that projection. */
export const Dashboard = Capability.makeModule(
  'Dashboard',
  {
    environments: [],
    requires: [Capabilities.PluginManager, ClientCapabilities.Client, AppCapabilities.Layout],
    provides: [SpaceCapabilities.Dashboard],
    activatesOn: ClientEvents.SpacesAvailable,
  },
  Effect.fnUntraced(function* () {
    const capabilityManager = yield* Capability.Service;
    const client = yield* Capability.get(ClientCapabilities.Client);
    const pluginManager = yield* Capability.get(Capabilities.PluginManager);
    const [layout] = capabilityManager.getAll(AppCapabilities.Layout);
    const [progress] = capabilityManager.getAll(AppCapabilities.ProgressRegistry);

    const dashboard = Atom.make((get): SpaceDashboard => {
      const plugins = get(pluginManager.enabled).length;
      const tasks = progress ? get(progress.snapshotAtom).tasks : [];
      if (layout) {
        get(layout);
      }
      const space = layout ? AppSpace.getActiveSpace(client, capabilityManager) : undefined;
      if (!space) {
        return { stats: toSpaceStats([], plugins), tasks, favorites: [] };
      }

      const counts = get(space.db.query(SPACE_STATS_QUERY).atom);
      const tag = findFavoriteTag(get(space.db.query(Filter.type(Tag.Tag)).atom));
      const uri = tag && Obj.getURI(tag);
      const favorites = uri ? get(space.db.query(Filter.tag(uri)).atom) : [];
      return {
        stats: toSpaceStats(counts, plugins),
        tasks,
        favorites: toShortcuts(favorites, MAX_SHORTCUTS).filter((entry) => entry !== null),
      };
    });

    return Capability.contribute(SpaceCapabilities.Dashboard, dashboard);
  }),
);
