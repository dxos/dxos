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
import { Keyboard } from '@dxos/keyboard';
import { runAction } from '@dxos/plugin-graph';
import { getHostPlatform } from '@dxos/util';

import { KEY_BINDING } from '#meta';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const { graph } = yield* AppCapabilities.AppGraph;
    const invoker = yield* Capabilities.OperationInvoker;
    const pluginContext = yield* Capability.Service;

    // TODO(wittjosiah): Factor out.
    // TODO(wittjosiah): Handle removal of actions.
    const visitor = (node: AppGraphNode.Node, path: string[]) => {
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
        Keyboard.singleton.getContext(path.slice(0, -1).join('/')).bind({
          shortcut,
          handler: () => void runAction(invoker, pluginContext, node, { parent: node, caller: KEY_BINDING }),
          data: node.properties.label,
        });
      }
    };

    const syncBindings = () => {
      AppGraph.traverse(graph, { relation: ['child', 'action'], visitor });
    };

    const eventHandler = debounce(syncBindings, 500);

    const unsubscribe = graph.onNodeChanged.on(eventHandler);
    syncBindings();

    // TODO(burdon): Create context and plugin.
    Keyboard.singleton.initialize();
    Keyboard.singleton.setCurrentContext(GraphNode.RootId);

    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        unsubscribe();
        Keyboard.singleton.destroy();
      }),
    );
    return [];
  }),
);
