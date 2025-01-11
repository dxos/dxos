//
// Copyright 2025 DXOS.org
//

import { Capabilities as AppCapabilities, contributes, type PluginsContext } from '@dxos/app-framework/next';
import { Keyboard } from '@dxos/keyboard';
import { isAction } from '@dxos/plugin-graph';
import { getHostPlatform } from '@dxos/util';

import { KEY_BINDING } from '../meta';

export default (context: PluginsContext) => {
  const { graph } = context.requestCapability(AppCapabilities.AppGraph);

  // TODO(wittjosiah): Factor out.
  // TODO(wittjosiah): Handle removal of actions.
  const unsubscribe = graph.subscribeTraverse({
    visitor: (node, path) => {
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

      if (shortcut && isAction(node)) {
        Keyboard.singleton.getContext(path.slice(0, -1).join('/')).bind({
          shortcut,
          handler: () => {
            void node.data({ node, caller: KEY_BINDING });
          },
          data: node.properties.label,
        });
      }
    },
  });

  // TODO(burdon): Create context and plugin.
  Keyboard.singleton.initialize();
  Keyboard.singleton.setCurrentContext(graph.root.id);

  return contributes(AppCapabilities.Null, null, () => {
    unsubscribe();
    Keyboard.singleton.destroy();
  });
};
