//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppGraph from '@dxos/app-graph/AppGraph';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as AttentionCapabilities from '@dxos/plugin-attention/AttentionCapabilities';

import { meta } from '#meta';
import { translations } from '#translations';
import { NavTreeCapabilities } from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../../PLUGIN.mdl?raw';

export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder'));
export const Expose = Capability.inlineModule(
  'expose',
  { requires: [AppCapabilities.AppGraph, AppCapabilities.Layout, Capabilities.OperationInvoker], provides: [] },
  Effect.fnUntraced(function* () {
    const layout = yield* Capabilities.getAtomValue(AppCapabilities.Layout);
    const { invokePromise } = yield* Capabilities.OperationInvoker;
    const { graph } = yield* AppCapabilities.AppGraph;
    if (invokePromise && layout.active.length === 1) {
      // TODO(wittjosiah): This should really be fired once the navtree renders for the first time.
      //   That is the point at which the graph is expanded and the path should be available.
      void AppGraph.waitForPath(graph, { target: layout.active[0] }, { timeout: 30_000 })
        .then(() => invokePromise(LayoutOperation.Expose, { subject: layout.active[0] }))
        .catch(() => {});
    }

    return [];
  }),
);
export const Keyboard = Capability.lazyModule(
  'Keyboard',
  { requires: [AppCapabilities.AppGraph, Capabilities.OperationInvoker], provides: [] },
  () => import('./keyboard'),
);
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'));
export const PluginAsset = AppCapability.pluginAsset({
  pluginId: meta.profile.key,
  path: 'PLUGIN.mdl',
  content: pluginSpec,
  mimeType: 'application/x-mdl',
});
export const ReactSurface = AppCapability.surface(() => import('./react-surface'), {
  roles: [
    'org.dxos.role.dialog',
    'org.dxos.role.documentTitle',
    'org.dxos.role.navigation',
    'org.dxos.role.searchInput',
  ],
});
export const State = Capability.lazyModule(
  'State',
  {
    // ViewState is the persistence backend for per-path expansion.
    requires: [Capabilities.AtomRegistry, AppCapabilities.Layout, AttentionCapabilities.ViewState],
    provides: [NavTreeCapabilities.State],
  },
  () => import('./state'),
);
export const Translations = AppCapability.translations(translations);
