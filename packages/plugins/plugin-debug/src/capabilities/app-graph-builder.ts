//
// Copyright 2025 DXOS.org
//

import { contributes, Capabilities, type PluginsContext } from '@dxos/app-framework';
import { createExtension, toSignal, type Node } from '@dxos/plugin-graph';
import { CollectionType } from '@dxos/plugin-space/types';
import { SpaceState } from '@dxos/react-client/echo';
import { isSpace, type Space } from '@dxos/react-client/echo';

import { DEBUG_PLUGIN } from '../meta';
import { type DebugSettingsProps } from '../types';

export default (context: PluginsContext) =>
  contributes(Capabilities.AppGraphBuilder, [
    // Devtools node.
    createExtension({
      id: 'dxos.org/plugin/debug/devtools',
      filter: (node): node is Node<null> => {
        const settings = context
          .requestCapabilities(Capabilities.SettingsStore)[0]
          ?.getStore<DebugSettingsProps>(DEBUG_PLUGIN)?.value;
        return !!settings?.devtools && node.id === 'root';
      },
      connector: () => [
        {
          // TODO(zan): Removed `/` because it breaks deck layout reload. Fix?
          id: 'dxos.org.plugin.debug.devtools',
          data: 'devtools',
          type: 'dxos.org/plugin/debug/devtools',
          properties: {
            label: ['devtools label', { ns: DEBUG_PLUGIN }],
            disposition: 'navigation',
            icon: 'ph--hammer--regular',
          },
        },
      ],
    }),

    // Debug node.
    createExtension({
      id: 'dxos.org/plugin/debug/debug',
      filter: (node): node is Node<null> => {
        const settings = context
          .requestCapabilities(Capabilities.SettingsStore)[0]
          ?.getStore<DebugSettingsProps>(DEBUG_PLUGIN)?.value;
        return !!settings?.debug && node.id === 'root';
      },
      connector: () => {
        const [graph] = context.requestCapabilities(Capabilities.AppGraph);
        if (!graph) {
          return;
        }

        return [
          {
            id: 'dxos.org/plugin/debug/debug',
            type: 'dxos.org/plugin/debug/debug',
            data: { graph },
            properties: {
              label: ['debug label', { ns: DEBUG_PLUGIN }],
              disposition: 'navigation',
              icon: 'ph--bug--regular',
            },
          },
        ];
      },
    }),

    // Space debug nodes.
    createExtension({
      id: 'dxos.org/plugin/debug/spaces',
      filter: (node): node is Node<Space> => {
        const settings = context
          .requestCapabilities(Capabilities.SettingsStore)[0]
          ?.getStore<DebugSettingsProps>(DEBUG_PLUGIN)?.value;
        return !!settings?.debug && isSpace(node.data);
      },
      connector: ({ node }) => {
        const space = node.data;
        const state = toSignal(
          (onChange) => space.state.subscribe(() => onChange()).unsubscribe,
          () => space.state.get(),
          space.id,
        );
        if (state !== SpaceState.SPACE_READY) {
          return;
        }

        // Not adding the debug node until the root collection is available aligns the behaviour of this
        // extension with that of the space plugin adding objects. This ensures that the debug node is added at
        // the same time as objects and prevents order from changing as the nodes are added.
        const collection = space.properties[CollectionType.typename]?.target as CollectionType | undefined;
        if (!collection) {
          return;
        }

        return [
          {
            // TODO(wittjosiah): Cannot use slashes in ids until we have a router which decouples ids from url paths.
            id: `${space.id}-debug`, // TODO(burdon): Change to slashes consistently.
            type: 'dxos.org/plugin/debug/space',
            data: { space, type: 'dxos.org/plugin/debug/space' },
            properties: {
              label: ['debug label', { ns: DEBUG_PLUGIN }],
              icon: 'ph--bug--regular',
            },
          },
        ];
      },
    }),
  ]);
