//
// Copyright 2025 DXOS.org
//

import { contributes, Capabilities, type PluginsContext } from '@dxos/app-framework';
import { createExtension, toSignal, type Node } from '@dxos/plugin-graph';
import { CollectionType } from '@dxos/plugin-space/types';
import { isSpace, SpaceState, type Space } from '@dxos/react-client/echo';

import { DEBUG_PLUGIN } from '../meta';
import { Devtools } from '../types';

const DEVTOOLS_TYPE = 'dxos.org/plugin/debug/devtools';

export default (context: PluginsContext) =>
  contributes(Capabilities.AppGraphBuilder, [
    // Devtools node.
    createExtension({
      id: 'dxos.org/plugin/debug/devtools',
      filter: (node): node is Node<null | Space> => node.id === 'root' || isSpace(node.data),
      connector: ({ node }) => {
        const space = node.data;
        const state = toSignal(
          (onChange) => space?.state.subscribe(() => onChange()).unsubscribe ?? (() => {}),
          () => space?.state.get(),
          space?.id,
        );
        if (node.id !== 'root' && state !== SpaceState.SPACE_READY) {
          return;
        }

        // Not adding the debug node until the root collection is available aligns the behaviour of this
        // extension with that of the space plugin adding objects. This ensures that the debug node is added at
        // the same time as objects and prevents order from changing as the nodes are added.
        const collection = space?.properties[CollectionType.typename]?.target as CollectionType | undefined;
        if (node.id !== 'root' && !collection) {
          return;
        }

        return [
          {
            id: `${node.id}-${Devtools.id}`,
            data: null,
            type: DEVTOOLS_TYPE,
            properties: {
              label: ['devtools label', { ns: DEBUG_PLUGIN }],
              disposition: 'workspace',
              icon: 'ph--hammer--regular',
            },
            nodes: [
              ...(isSpace(node.data)
                ? [
                    {
                      id: `${node.data.id}-debug`,
                      type: 'dxos.org/plugin/debug/space',
                      data: { space: node.data, type: 'dxos.org/plugin/debug/space' },
                      properties: {
                        label: ['debug label', { ns: DEBUG_PLUGIN }],
                        icon: 'ph--bug--regular',
                      },
                    },
                  ]
                : []),
              {
                id: `${node.id}-${Devtools.Client.id}`,
                data: null,
                type: DEVTOOLS_TYPE,
                properties: {
                  label: ['client label', { ns: DEBUG_PLUGIN }],
                  icon: 'ph--users--regular',
                },
                nodes: [
                  {
                    id: `${node.id}-${Devtools.Client.Config}`,
                    data: Devtools.Client.Config,
                    type: DEVTOOLS_TYPE,
                    properties: {
                      label: ['config label', { ns: DEBUG_PLUGIN }],
                      icon: 'ph--gear--regular',
                    },
                  },
                  {
                    id: `${node.id}-${Devtools.Client.Storage}`,
                    data: Devtools.Client.Storage,
                    type: DEVTOOLS_TYPE,
                    properties: {
                      label: ['storage label', { ns: DEBUG_PLUGIN }],
                      icon: 'ph--hard-drives--regular',
                    },
                  },
                  {
                    id: `${node.id}-${Devtools.Client.Logs}`,
                    data: Devtools.Client.Logs,
                    type: DEVTOOLS_TYPE,
                    properties: {
                      label: ['logs label', { ns: DEBUG_PLUGIN }],
                      icon: 'ph--file-text--regular',
                    },
                  },
                  {
                    id: `${node.id}-${Devtools.Client.Diagnostics}`,
                    data: Devtools.Client.Diagnostics,
                    type: DEVTOOLS_TYPE,
                    properties: {
                      label: ['diagnostics label', { ns: DEBUG_PLUGIN }],
                      icon: 'ph--chart-line--regular',
                    },
                  },
                  {
                    id: `${node.id}-${Devtools.Client.Tracing}`,
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
                id: `${node.id}-${Devtools.Halo.id}`,
                data: null,
                type: DEVTOOLS_TYPE,
                properties: {
                  label: ['halo label', { ns: DEBUG_PLUGIN }],
                  icon: 'ph--identification-badge--regular',
                },
                nodes: [
                  {
                    id: `${node.id}-${Devtools.Halo.Identity}`,
                    data: Devtools.Halo.Identity,
                    type: DEVTOOLS_TYPE,
                    properties: {
                      label: ['identity label', { ns: DEBUG_PLUGIN }],
                      icon: 'ph--identification-badge--regular',
                    },
                  },
                  {
                    id: `${node.id}-${Devtools.Halo.Devices}`,
                    data: Devtools.Halo.Devices,
                    type: DEVTOOLS_TYPE,
                    properties: {
                      label: ['devices label', { ns: DEBUG_PLUGIN }],
                      icon: 'ph--devices--regular',
                    },
                  },
                  {
                    id: `${node.id}-${Devtools.Halo.Keyring}`,
                    data: Devtools.Halo.Keyring,
                    type: DEVTOOLS_TYPE,
                    properties: {
                      label: ['keyring label', { ns: DEBUG_PLUGIN }],
                      icon: 'ph--key--regular',
                    },
                  },
                  {
                    id: `${node.id}-${Devtools.Halo.Credentials}`,
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
                id: `${node.id}-${Devtools.Echo.id}`,
                data: null,
                type: DEVTOOLS_TYPE,
                properties: {
                  label: ['echo label', { ns: DEBUG_PLUGIN }],
                  icon: 'ph--database--regular',
                },
                nodes: [
                  {
                    id: `${node.id}-${Devtools.Echo.Spaces}`,
                    data: Devtools.Echo.Spaces,
                    type: DEVTOOLS_TYPE,
                    properties: {
                      label: ['spaces label', { ns: DEBUG_PLUGIN }],
                      icon: 'ph--graph--regular',
                    },
                  },
                  {
                    id: `${node.id}-${Devtools.Echo.Space}`,
                    data: Devtools.Echo.Space,
                    type: DEVTOOLS_TYPE,
                    properties: {
                      label: ['space label', { ns: DEBUG_PLUGIN }],
                      icon: 'ph--planet--regular',
                    },
                  },
                  {
                    id: `${node.id}-${Devtools.Echo.Feeds}`,
                    data: Devtools.Echo.Feeds,
                    type: DEVTOOLS_TYPE,
                    properties: {
                      label: ['feeds label', { ns: DEBUG_PLUGIN }],
                      icon: 'ph--list-bullets--regular',
                    },
                  },
                  {
                    id: `${node.id}-${Devtools.Echo.Objects}`,
                    data: Devtools.Echo.Objects,
                    type: DEVTOOLS_TYPE,
                    properties: {
                      label: ['objects label', { ns: DEBUG_PLUGIN }],
                      icon: 'ph--database--regular',
                    },
                  },
                  {
                    id: `${node.id}-${Devtools.Echo.Automerge}`,
                    data: Devtools.Echo.Automerge,
                    type: DEVTOOLS_TYPE,
                    properties: {
                      label: ['automerge label', { ns: DEBUG_PLUGIN }],
                      icon: 'ph--gear-six--regular',
                    },
                  },
                  {
                    id: `${node.id}-${Devtools.Echo.Queues}`,
                    data: Devtools.Echo.Queues,
                    type: DEVTOOLS_TYPE,
                    properties: {
                      label: ['queues label', { ns: DEBUG_PLUGIN }],
                      icon: 'ph--queue--regular',
                    },
                  },
                  {
                    id: `${node.id}-${Devtools.Echo.Members}`,
                    data: Devtools.Echo.Members,
                    type: DEVTOOLS_TYPE,
                    properties: {
                      label: ['members label', { ns: DEBUG_PLUGIN }],
                      icon: 'ph--users--regular',
                    },
                  },
                  {
                    id: `${node.id}-${Devtools.Echo.Metadata}`,
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
                id: `${node.id}-${Devtools.Mesh.id}`,
                data: null,
                type: DEVTOOLS_TYPE,
                properties: {
                  label: ['mesh label', { ns: DEBUG_PLUGIN }],
                  icon: 'ph--graph--regular',
                },
                nodes: [
                  {
                    id: `${node.id}-${Devtools.Mesh.Signal}`,
                    data: Devtools.Mesh.Signal,
                    type: DEVTOOLS_TYPE,
                    properties: {
                      label: ['signal label', { ns: DEBUG_PLUGIN }],
                      icon: 'ph--wifi-high--regular',
                    },
                  },
                  {
                    id: `${node.id}-${Devtools.Mesh.Swarm}`,
                    data: Devtools.Mesh.Swarm,
                    type: DEVTOOLS_TYPE,
                    properties: {
                      label: ['swarm label', { ns: DEBUG_PLUGIN }],
                      icon: 'ph--users-three--regular',
                    },
                  },
                  {
                    id: `${node.id}-${Devtools.Mesh.Network}`,
                    data: Devtools.Mesh.Network,
                    type: DEVTOOLS_TYPE,
                    properties: {
                      label: ['network label', { ns: DEBUG_PLUGIN }],
                      icon: 'ph--polygon--regular',
                    },
                  },
                ],
              },
              // TODO(wittjosiah): Remove?
              // {
              //   id: `${node.id}-${Devtools.Agent.id}`,
              //   data: null,
              //   type: DEVTOOLS_TYPE,
              //   properties: {
              //     label: ['agent label', { ns: DEBUG_PLUGIN }],
              //     icon: 'ph--robot--regular',
              //   },
              //   nodes: [
              //     {
              //       id: `${node.id}-${Devtools.Agent.Dashboard}`,
              //       data: Devtools.Agent.Dashboard,
              //       type: DEVTOOLS_TYPE,
              //       properties: {
              //         label: ['dashboard label', { ns: DEBUG_PLUGIN }],
              //         icon: 'ph--computer-tower--regular',
              //       },
              //     },
              //   ],
              // },
              {
                id: `${node.id}-${Devtools.Edge.id}`,
                data: null,
                type: DEVTOOLS_TYPE,
                properties: {
                  label: ['edge label', { ns: DEBUG_PLUGIN }],
                  icon: 'ph--cloud--regular',
                },
                nodes: [
                  {
                    id: `${node.id}-${Devtools.Edge.Dashboard}`,
                    data: Devtools.Edge.Dashboard,
                    type: DEVTOOLS_TYPE,
                    properties: {
                      label: ['dashboard label', { ns: DEBUG_PLUGIN }],
                      icon: 'ph--computer-tower--regular',
                    },
                  },
                  {
                    id: `${node.id}-${Devtools.Edge.Workflows}`,
                    data: Devtools.Edge.Workflows,
                    type: DEVTOOLS_TYPE,
                    properties: {
                      label: ['workflows label', { ns: DEBUG_PLUGIN }],
                      icon: 'ph--function--regular',
                    },
                  },
                  {
                    id: `${node.id}-${Devtools.Edge.Traces}`,
                    data: Devtools.Edge.Traces,
                    type: DEVTOOLS_TYPE,
                    properties: {
                      label: ['traces label', { ns: DEBUG_PLUGIN }],
                      icon: 'ph--line-segments--regular',
                    },
                  },
                ],
              },
            ],
          },
        ];
      },
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
  ]);
