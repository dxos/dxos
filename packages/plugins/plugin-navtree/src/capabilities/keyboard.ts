//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppGraph from '@dxos/app-graph/AppGraph';
import * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { debounce } from '@dxos/async';
import * as GraphNode from '@dxos/graph/GraphNode';
import { runAction } from '@dxos/plugin-graph';
import {
  type CommandDefinition,
  hotkeyStore,
  initHotkeys,
  reconcileHotkeys,
  setHotkeyScope,
} from '@dxos/react-focus/store';
import { getHostPlatform } from '@dxos/util';

import { KEY_BINDING } from '#meta';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const { graph } = yield* AppCapabilities.AppGraph;
    const invoker = yield* Capabilities.OperationInvoker;
    const pluginContext = yield* Capability.Service;

    // What the last sync registered, so the next one only touches ids that changed.
    let registered = new Map<string, CommandDefinition>();

    // TODO(wittjosiah): Factor out.
    const visitor = (next: Map<string, CommandDefinition>) => (node: AppGraphNode.Node, path: string[]) => {
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
        next.set(id, {
          id,
          hotkey: shortcut,
          scopes: [scope],
          label: node.properties.label,
          // Resolved when fired, since an unchanged binding is not re-registered with the newer node.
          action: () => {
            const current = Option.getOrUndefined(AppGraph.getNode(graph, node.id));
            if (current && AppGraphNode.isAction(current)) {
              void runAction(invoker, pluginContext, current, { parent: current, caller: KEY_BINDING });
            }
          },
          // Bindings came from graph actions, which fired everywhere; Ark excludes text fields
          // unless a command opts in.
          options: { enableOnFormTags: true, enableOnContentEditable: true },
        });
      }
    };

    const syncBindings = () => {
      const next = new Map<string, CommandDefinition>();
      AppGraph.traverse(graph, { relation: ['child', 'action'], visitor: visitor(next) });
      reconcileHotkeys(hotkeyStore, registered, next);
      registered = next;
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
        // Only the bindings this capability registered: the store is shared with every component
        // that calls `useHotkeys`, so destroying it here would silently unbind all of them.
        reconcileHotkeys(hotkeyStore, registered, new Map());
        registered = new Map();
      }),
    );
    return [];
  }),
);
