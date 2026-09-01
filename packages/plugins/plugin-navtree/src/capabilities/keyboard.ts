//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppGraph from '@dxos/app-graph/AppGraph';
import * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { debounce } from '@dxos/async';
import * as GraphNode from '@dxos/graph/GraphNode';
import { runAction } from '@dxos/plugin-graph';
import { destroyHotkeys, hotkeyStore, initHotkeys, setHotkeyScope } from '@dxos/react-focus/store';
import { getHostPlatform } from '@dxos/util';

import { KEY_BINDING } from '#meta';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const { graph } = yield* AppCapabilities.AppGraph;
    const invoker = yield* Capabilities.OperationInvoker;
    const pluginContext = yield* Capability.Service;

    // Ids registered by the last sync, so a re-sync can retire the ones the graph no longer has.
    let registered = new Set<string>();

    // TODO(wittjosiah): Factor out.
    const visitor = (seen: Set<string>) => (node: AppGraphNode.Node, path: string[]) => {
      let shortcut: string | undefined;
      if (typeof node.properties.keyBinding === 'object') {
        const availablePlatforms = Object.keys(node.properties.keyBinding);
        const platform = getHostPlatform();
        shortcut = availablePlatforms.includes(platform)
          ? node.properties.keyBinding[platform]
          : platform === 'ios'
            ? node.properties.keyBinding.macos // Fallback to macos if ios-specific bindings not provided.
            : platform === 'linux' || platform === 'unknown'
              ? node.properties.keyBinding.windows // Fallback to windows if platform-specific bindings not provided.
              : undefined;
      } else {
        shortcut = node.properties.keyBinding;
      }

      if (shortcut && AppGraphNode.isAction(node)) {
        const scope = path.slice(0, -1).join('/');
        const id = `${scope}:${node.id}`;
        seen.add(id);
        // Unregister first: the store warns on a duplicate id rather than replacing, and this
        // re-runs on every graph change.
        hotkeyStore.unregister(id);
        hotkeyStore.register({
          id,
          hotkey: shortcut,
          scopes: [scope],
          label: node.properties.label,
          action: () => void runAction(invoker, pluginContext, node, { parent: node, caller: KEY_BINDING }),
          // Bindings came from graph actions, which fired everywhere; Ark excludes text fields
          // unless a command opts in.
          options: { enableOnFormTags: true, enableOnContentEditable: true },
        });
      }
    };

    const syncBindings = () => {
      const seen = new Set<string>();
      AppGraph.traverse(graph, { relation: ['child', 'action'], visitor: visitor(seen) });
      // Actions the graph has dropped since the last pass.
      for (const id of registered) {
        if (!seen.has(id)) {
          hotkeyStore.unregister(id);
        }
      }
      registered = seen;
    };

    const eventHandler = debounce(syncBindings, 500);

    const unsubscribe = graph.onNodeChanged.on(eventHandler);
    syncBindings();

    // TODO(burdon): Create context and plugin.
    initHotkeys();
    setHotkeyScope(GraphNode.RootId);

    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        unsubscribe();
        destroyHotkeys();
      }),
    );
    return [];
  }),
);
