//
// Copyright 2025 DXOS.org
//

import { contributes, Capabilities, type PluginsContext } from '@dxos/app-framework';
import { createExtension, toSignal, type Node } from '@dxos/plugin-graph';
import { CollectionType } from '@dxos/plugin-space/types';
import { SpaceState } from '@dxos/react-client/echo';
import { isSpace, type Space } from '@dxos/react-client/echo';

import { DEBUG_PLUGIN } from '../meta';
import { type DebugSettingsProps, Devtools } from '../types';

const DEVTOOLS_TYPE = 'dxos.org/plugin/debug/devtools';

export default (context: PluginsContext) =>
  contributes(Capabilities.AppGraphBuilder, [
    // Devtools node.
    createExtension({
      id: 'dxos.org/plugin/debug/devtools',
      filter: (node): node is Node<null> => node.id === 'root',
      connector: () => [
        {
          id: Devtools.id,
          data: null,
          type: DEVTOOLS_TYPE,
          properties: {
            label: ['devtools label', { ns: DEBUG_PLUGIN }],
            disposition: 'workspace',
            icon: 'ph--hammer--regular',
          },
          nodes: [
            {
              id: Devtools.Client.id,
              data: null,
              type: DEVTOOLS_TYPE,
              properties: {
                label: ['client label', { ns: DEBUG_PLUGIN }],
                icon: 'ph--users--regular',
              },
              nodes: [
                {
                  id: Devtools.Client.Config,
                  data: Devtools.Client.Config,
                  type: DEVTOOLS_TYPE,
                  properties: {
                    label: ['config label', { ns: DEBUG_PLUGIN }],
                    icon: 'ph--gear--regular',
                  },
                },
                {
                  id: Devtools.Client.Storage,
                  data: Devtools.Client.Storage,
                  type: DEVTOOLS_TYPE,
                  properties: {
                    label: ['storage label', { ns: DEBUG_PLUGIN }],
                    icon: 'ph--hard-drives--regular',
                  },
                },
                {
                  id: Devtools.Client.Logs,
                  data: Devtools.Client.Logs,
                  type: DEVTOOLS_TYPE,
                  properties: {
                    label: ['logs label', { ns: DEBUG_PLUGIN }],
                    icon: 'ph--file-text--regular',
                  },
                },
                {
                  id: Devtools.Client.Diagnostics,
                  data: Devtools.Client.Diagnostics,
                  type: DEVTOOLS_TYPE,
                  properties: {
                    label: ['diagnostics label', { ns: DEBUG_PLUGIN }],
                    icon: 'ph--chart-line--regular',
                  },
                },
                {
                  id: Devtools.Client.Tracing,
                  data: Devtools.Client.Tracing,
                  type: DEVTOOLS_TYPE,
                  properties: {
                    label: ['tracing label', { ns: DEBUG_PLUGIN }],
                    icon: 'ph--fire--regular',
                  },
                },
              ],
            },
            {
              id: Devtools.Halo.id,
              data: null,
              type: DEVTOOLS_TYPE,
              properties: {
                label: ['halo label', { ns: DEBUG_PLUGIN }],
                icon: 'ph--identification-badge--regular',
              },
              nodes: [
                {
                  id: Devtools.Halo.Identity,
                  data: Devtools.Halo.Identity,
                  type: DEVTOOLS_TYPE,
                  properties: {
                    label: ['identity label', { ns: DEBUG_PLUGIN }],
                    icon: 'ph--identification-badge--regular',
                  },
                },
                {
                  id: Devtools.Halo.Devices,
                  data: Devtools.Halo.Devices,
                  type: DEVTOOLS_TYPE,
                  properties: {
                    label: ['devices label', { ns: DEBUG_PLUGIN }],
                    icon: 'ph--devices--regular',
                  },
                },
                {
                  id: Devtools.Halo.Keyring,
                  data: Devtools.Halo.Keyring,
                  type: DEVTOOLS_TYPE,
                  properties: {
                    label: ['keyring label', { ns: DEBUG_PLUGIN }],
                    icon: 'ph--key--regular',
                  },
                },
                {
                  id: Devtools.Halo.Credentials,
                  data: Devtools.Halo.Credentials,
                  type: DEVTOOLS_TYPE,
                  properties: {
                    label: ['credentials label', { ns: DEBUG_PLUGIN }],
                    icon: 'ph--credit-card--regular',
                  },
                },
              ],
            },
            {
              id: Devtools.Echo.id,
              data: null,
              type: DEVTOOLS_TYPE,
              properties: {
                label: ['echo label', { ns: DEBUG_PLUGIN }],
                icon: 'ph--database--regular',
              },
              nodes: [
                {
                  id: Devtools.Echo.Spaces,
                  data: Devtools.Echo.Spaces,
                  type: DEVTOOLS_TYPE,
                  properties: {
                    label: ['spaces label', { ns: DEBUG_PLUGIN }],
                    icon: 'ph--graph--regular',
                  },
                },
                {
                  id: Devtools.Echo.Space,
                  data: Devtools.Echo.Space,
                  type: DEVTOOLS_TYPE,
                  properties: {
                    label: ['space label', { ns: DEBUG_PLUGIN }],
                    icon: 'ph--planet--regular',
                  },
                },
                {
                  id: Devtools.Echo.Feeds,
                  data: Devtools.Echo.Feeds,
                  type: DEVTOOLS_TYPE,
                  properties: {
                    label: ['feeds label', { ns: DEBUG_PLUGIN }],
                    icon: 'ph--queue--regular',
                  },
                },
                {
                  id: Devtools.Echo.Objects,
                  data: Devtools.Echo.Objects,
                  type: DEVTOOLS_TYPE,
                  properties: {
                    label: ['objects label', { ns: DEBUG_PLUGIN }],
                    icon: 'ph--database--regular',
                  },
                },
                {
                  id: Devtools.Echo.Automerge,
                  data: Devtools.Echo.Automerge,
                  type: DEVTOOLS_TYPE,
                  properties: {
                    label: ['automerge label', { ns: DEBUG_PLUGIN }],
                    icon: 'ph--gear-six--regular',
                  },
                },
                {
                  id: Devtools.Echo.Members,
                  data: Devtools.Echo.Members,
                  type: DEVTOOLS_TYPE,
                  properties: {
                    label: ['members label', { ns: DEBUG_PLUGIN }],
                    icon: 'ph--users--regular',
                  },
                },
                {
                  id: Devtools.Echo.Metadata,
                  data: Devtools.Echo.Metadata,
                  type: DEVTOOLS_TYPE,
                  properties: {
                    label: ['metadata label', { ns: DEBUG_PLUGIN }],
                    icon: 'ph--hard-drive--regular',
                  },
                },
              ],
            },
            {
              id: Devtools.Mesh.id,
              data: null,
              type: DEVTOOLS_TYPE,
              properties: {
                label: ['mesh label', { ns: DEBUG_PLUGIN }],
                icon: 'ph--graph--regular',
              },
              nodes: [
                {
                  id: Devtools.Mesh.Signal,
                  data: Devtools.Mesh.Signal,
                  type: DEVTOOLS_TYPE,
                  properties: {
                    label: ['signal label', { ns: DEBUG_PLUGIN }],
                    icon: 'ph--wifi-high--regular',
                  },
                },
                {
                  id: Devtools.Mesh.Swarm,
                  data: Devtools.Mesh.Swarm,
                  type: DEVTOOLS_TYPE,
                  properties: {
                    label: ['swarm label', { ns: DEBUG_PLUGIN }],
                    icon: 'ph--users-three--regular',
                  },
                },
                {
                  id: Devtools.Mesh.Network,
                  data: Devtools.Mesh.Network,
                  type: DEVTOOLS_TYPE,
                  properties: {
                    label: ['network label', { ns: DEBUG_PLUGIN }],
                    icon: 'ph--polygon--regular',
                  },
                },
              ],
            },
            {
              id: Devtools.Agent.id,
              data: null,
              type: DEVTOOLS_TYPE,
              properties: {
                label: ['agent label', { ns: DEBUG_PLUGIN }],
                icon: 'ph--robot--regular',
              },
              nodes: [
                {
                  id: Devtools.Agent.Dashboard,
                  data: Devtools.Agent.Dashboard,
                  type: DEVTOOLS_TYPE,
                  properties: {
                    label: ['dashboard label', { ns: DEBUG_PLUGIN }],
                    icon: 'ph--computer-tower--regular',
                  },
                },
                {
                  id: Devtools.Agent.Search,
                  data: Devtools.Agent.Search,
                  type: DEVTOOLS_TYPE,
                  properties: {
                    label: ['search label', { ns: DEBUG_PLUGIN }],
                    icon: 'ph--magnifying-glass--regular',
                  },
                },
              ],
            },
            {
              id: Devtools.Edge.id,
              data: null,
              type: DEVTOOLS_TYPE,
              properties: {
                label: ['edge label', { ns: DEBUG_PLUGIN }],
                icon: 'ph--cloud--regular',
              },
              nodes: [
                {
                  id: Devtools.Edge.Dashboard,
                  data: Devtools.Edge.Dashboard,
                  type: DEVTOOLS_TYPE,
                  properties: {
                    label: ['dashboard label', { ns: DEBUG_PLUGIN }],
                    icon: 'ph--computer-tower--regular',
                  },
                },
                {
                  id: Devtools.Edge.Workflows,
                  data: Devtools.Edge.Workflows,
                  type: DEVTOOLS_TYPE,
                  properties: {
                    label: ['workflows label', { ns: DEBUG_PLUGIN }],
                    icon: 'ph--function--regular',
                  },
                },
              ],
            },
          ],
        },
      ],
    }),

    // Debug node.
    createExtension({
      id: 'dxos.org/plugin/debug/debug',
      filter: (node): node is Node<null> => {
        // TODO(wittjosiah): Plank is currently blank. Remove?
        // const settings = context
        //   .requestCapabilities(Capabilities.SettingsStore)[0]
        //   ?.getStore<DebugSettingsProps>(DEBUG_PLUGIN)?.value;
        // return !!settings?.debug && node.id === 'root';
        return false;
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
