//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { debounce } from '@dxos/async';
import { Keyboard } from '@dxos/keyboard';
import { Graph, Node, runAction } from '@dxos/plugin-graph';
import { getHostPlatform } from '@dxos/util';

import { KEY_BINDING } from '../../meta';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const { graph } = yield* Capability.get(AppCapabilities.AppGraph);
    const invoker = yield* Capability.get(Capabilities.OperationInvoker);
    const pluginContext = yield* Capability.Service;

    // TODO(wittjosiah): Factor out.
    // TODO(wittjosiah): Handle removal of actions.
    const visitor = (node: Node.Node, path: string[]) => {
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

      if (shortcut && Node.isAction(node)) {
        Keyboard.singleton.getContext(path.slice(0, -1).join('/')).bind({
          shortcut,
          handler: () => void runAction(invoker, pluginContext, node, { parent: node, caller: KEY_BINDING }),
          data: node.properties.label,
        });
      }
    };

    const eventHandler = debounce(() => {
      Graph.traverse(graph, { visitor });
    }, 500);

    const unsubscribe = graph.onNodeChanged.on(eventHandler);

    // TODO(burdon): Create context and plugin.
    Keyboard.singleton.initialize();
    Keyboard.singleton.setCurrentContext(Node.RootId);

    return Capability.contributes(Capabilities.Null, null, () =>
      Effect.sync(() => {
        unsubscribe();
        Keyboard.singleton.destroy();
      }),
    );
  }),
);
