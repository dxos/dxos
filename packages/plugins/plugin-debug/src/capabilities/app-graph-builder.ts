//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, AppNode, Paths } from '@dxos/app-toolkit';
import { ClientCapabilities } from '@dxos/plugin-client';
import { GraphBuilder, Node, NodeMatcher } from '@dxos/plugin-graph';
import { SPACE_TYPE } from '@dxos/plugin-space';
import { getParentId } from '@dxos/react-ui-attention';

import { meta } from '#meta';
import { Devtools } from '#types';

const DEVTOOLS_TYPE = `${meta.profile.key}.devtools`;

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const extensions = yield* Effect.all([
      GraphBuilder.createExtension({
        id: 'root',
        match: NodeMatcher.whenRoot,
        actions: () =>
          Effect.succeed([
            Node.makeAction({
              id: 'resetData',
              data: () =>
                Effect.sync(() => {
                  window.location.href = '/reset.html#continue';
                }),
              properties: {
                label: ['reset-data.label', { ns: meta.profile.key }],
                icon: 'ph--warning--regular',
              },
            }),
          ]),
      }),

      GraphBuilder.createExtension({
        id: 'devtools',
        match: NodeMatcher.whenAny(NodeMatcher.whenRoot, NodeMatcher.whenNodeType(SPACE_TYPE)),
        connector: (node, get) =>
          Effect.gen(function* () {
            const client = yield* Capability.get(ClientCapabilities.Client);
            const layoutAtom = get(yield* Capability.atom(AppCapabilities.Layout))[0];
            const layout = layoutAtom ? get(layoutAtom) : undefined;
            const spaceId = layout?.workspace ? Paths.getSpaceIdFromPath(layout.workspace) : undefined;
            const space = spaceId ? client.spaces.get(spaceId) : undefined;
            const [graph] = get(yield* Capability.atom(AppCapabilities.AppGraph));

            return [
              Node.make({
                id: Devtools.id,
                data: null,
                type: DEVTOOLS_TYPE,
                properties: {
                  label: ['devtools.label', { ns: meta.profile.key }],
                  icon: 'ph--hammer--regular',
                  disposition: 'pin-end',
                  position: 'last',
                },
                nodes: [
                  Node.make({
                    id: 'appGraph',
                    type: `${meta.profile.key}.app-graph`,
                    data: { graph: graph?.graph, root: node.id === Node.RootId ? node.id : getParentId(node.id) },
                    properties: {
                      label: ['debug-app-graph.label', { ns: meta.profile.key }],
                      icon: 'ph--graph--regular',
                    },
                  }),
                  Node.make({
                    id: 'toolsExplorer',
                    data: Devtools.ToolsExplorer,
                    type: DEVTOOLS_TYPE,
                    properties: {
                      label: ['debug-tools-explorer.label', { ns: meta.profile.key }],
                      icon: 'ph--toolbox--regular',
                    },
                  }),
                  ...(space && node.type === SPACE_TYPE
                    ? [
                        Node.make({
                          id: 'debug',
                          type: `${meta.profile.key}.space`,
                          data: { space, type: `${meta.profile.key}.space` },
                          properties: {
                            label: ['generate-objects.label', { ns: meta.profile.key }],
                            icon: 'ph--dice-five--regular',
                          },
                        }),
                      ]
                    : []),
                  Node.make({
                    id: Devtools.Client.id,
                    data: null,
                    type: DEVTOOLS_TYPE,
                    properties: {
                      label: ['client.label', { ns: meta.profile.key }],
                      icon: 'ph--users--regular',
                    },
                    nodes: [
                      Node.make({
                        id: Devtools.Client.Config,
                        data: Devtools.Client.Config,
                        type: DEVTOOLS_TYPE,
                        properties: {
                          label: ['config.label', { ns: meta.profile.key }],
                          icon: 'ph--gear--regular',
                        },
                      }),
                      Node.make({
                        id: Devtools.Client.Storage,
                        data: Devtools.Client.Storage,
                        type: DEVTOOLS_TYPE,
                        properties: {
                          label: ['storage.label', { ns: meta.profile.key }],
                          icon: 'ph--hard-drives--regular',
                        },
                      }),
                      Node.make({
                        id: Devtools.Client.Sqlite,
                        data: Devtools.Client.Sqlite,
                        type: DEVTOOLS_TYPE,
                        properties: {
                          label: ['sqlite.label', { ns: meta.profile.key }],
                          icon: 'ph--database--regular',
                        },
                      }),
                      Node.make({
                        id: Devtools.Client.Logs,
                        data: Devtools.Client.Logs,
                        type: DEVTOOLS_TYPE,
                        properties: {
                          label: ['logs.label', { ns: meta.profile.key }],
                          icon: 'ph--file-text--regular',
                        },
                      }),
                      Node.make({
                        id: Devtools.Client.Diagnostics,
                        data: Devtools.Client.Diagnostics,
                        type: DEVTOOLS_TYPE,
                        properties: {
                          label: ['diagnostics.label', { ns: meta.profile.key }],
                          icon: 'ph--chart-line--regular',
                        },
                      }),
                    ],
                  }),
                  Node.make({
                    id: Devtools.Halo.id,
                    data: null,
                    type: DEVTOOLS_TYPE,
                    properties: {
                      label: ['halo.label', { ns: meta.profile.key }],
                      icon: 'ph--identification-badge--regular',
                    },
                    nodes: [
                      Node.make({
                        id: Devtools.Halo.Identity,
                        data: Devtools.Halo.Identity,
                        type: DEVTOOLS_TYPE,
                        properties: {
                          label: ['identity.label', { ns: meta.profile.key }],
                          icon: 'ph--identification-badge--regular',
                        },
                      }),
                      Node.make({
                        id: Devtools.Halo.Devices,
                        data: Devtools.Halo.Devices,
                        type: DEVTOOLS_TYPE,
                        properties: {
                          label: ['devices.label', { ns: meta.profile.key }],
                          icon: 'ph--devices--regular',
                        },
                      }),
                      Node.make({
                        id: Devtools.Halo.Keyring,
                        data: Devtools.Halo.Keyring,
                        type: DEVTOOLS_TYPE,
                        properties: {
                          label: ['keyring.label', { ns: meta.profile.key }],
                          icon: 'ph--key--regular',
                        },
                      }),
                      Node.make({
                        id: Devtools.Halo.Credentials,
                        data: Devtools.Halo.Credentials,
                        type: DEVTOOLS_TYPE,
                        properties: {
                          label: ['credentials.label', { ns: meta.profile.key }],
                          icon: 'ph--credit-card--regular',
                        },
                      }),
                    ],
                  }),
                  Node.make({
                    id: Devtools.Echo.id,
                    data: null,
                    type: DEVTOOLS_TYPE,
                    properties: {
                      label: ['echo.label', { ns: meta.profile.key }],
                      icon: 'ph--database--regular',
                    },
                    nodes: [
                      Node.make({
                        id: Devtools.Echo.Spaces,
                        data: Devtools.Echo.Spaces,
                        type: DEVTOOLS_TYPE,
                        properties: {
                          label: ['spaces.label', { ns: meta.profile.key }],
                          icon: 'ph--graph--regular',
                        },
                      }),
                      Node.make({
                        id: Devtools.Echo.Space,
                        data: Devtools.Echo.Space,
                        type: DEVTOOLS_TYPE,
                        properties: {
                          label: ['space.label', { ns: meta.profile.key }],
                          icon: 'ph--planet--regular',
                        },
                      }),
                      Node.make({
                        id: Devtools.Echo.Feeds,
                        data: Devtools.Echo.Feeds,
                        type: DEVTOOLS_TYPE,
                        properties: {
                          label: ['feeds.label', { ns: meta.profile.key }],
                          icon: 'ph--list-bullets--regular',
                        },
                      }),
                      Node.make({
                        id: Devtools.Echo.Objects,
                        data: Devtools.Echo.Objects,
                        type: DEVTOOLS_TYPE,
                        properties: {
                          label: ['objects.label', { ns: meta.profile.key }],
                          icon: 'ph--cube--regular',
                        },
                      }),
                      Node.make({
                        id: Devtools.Echo.Schema,
                        data: Devtools.Echo.Schema,
                        type: DEVTOOLS_TYPE,
                        properties: {
                          label: ['schema.label', { ns: meta.profile.key }],
                          icon: 'ph--database--regular',
                        },
                      }),
                      Node.make({
                        id: Devtools.Echo.Registry,
                        data: Devtools.Echo.Registry,
                        type: DEVTOOLS_TYPE,
                        properties: {
                          label: ['registry.label', { ns: meta.profile.key }],
                          icon: 'ph--books--regular',
                        },
                      }),
                      Node.make({
                        id: Devtools.Echo.Automerge,
                        data: Devtools.Echo.Automerge,
                        type: DEVTOOLS_TYPE,
                        properties: {
                          label: ['automerge.label', { ns: meta.profile.key }],
                          icon: 'ph--gear-six--regular',
                        },
                      }),
                      Node.make({
                        id: Devtools.Echo.Queues,
                        data: Devtools.Echo.Queues,
                        type: DEVTOOLS_TYPE,
                        properties: {
                          label: ['queues.label', { ns: meta.profile.key }],
                          icon: 'ph--queue--regular',
                        },
                      }),
                      Node.make({
                        id: Devtools.Echo.Members,
                        data: Devtools.Echo.Members,
                        type: DEVTOOLS_TYPE,
                        properties: {
                          label: ['members.label', { ns: meta.profile.key }],
                          icon: 'ph--users--regular',
                        },
                      }),
                      Node.make({
                        id: Devtools.Echo.Metadata,
                        data: Devtools.Echo.Metadata,
                        type: DEVTOOLS_TYPE,
                        properties: {
                          label: ['metadata.label', { ns: meta.profile.key }],
                          icon: 'ph--hard-drive--regular',
                        },
                      }),
                    ],
                  }),
                  Node.make({
                    id: Devtools.Mesh.id,
                    data: null,
                    type: DEVTOOLS_TYPE,
                    properties: {
                      label: ['mesh.label', { ns: meta.profile.key }],
                      icon: 'ph--graph--regular',
                    },
                    nodes: [
                      Node.make({
                        id: Devtools.Mesh.Signal,
                        data: Devtools.Mesh.Signal,
                        type: DEVTOOLS_TYPE,
                        properties: {
                          label: ['signal.label', { ns: meta.profile.key }],
                          icon: 'ph--wifi-high--regular',
                        },
                      }),
                      Node.make({
                        id: Devtools.Mesh.Swarm,
                        data: Devtools.Mesh.Swarm,
                        type: DEVTOOLS_TYPE,
                        properties: {
                          label: ['swarm.label', { ns: meta.profile.key }],
                          icon: 'ph--users-three--regular',
                        },
                      }),
                      Node.make({
                        id: Devtools.Mesh.Network,
                        data: Devtools.Mesh.Network,
                        type: DEVTOOLS_TYPE,
                        properties: {
                          label: ['network.label', { ns: meta.profile.key }],
                          icon: 'ph--polygon--regular',
                        },
                      }),
                    ],
                  }),
                  Node.make({
                    id: Devtools.Edge.id,
                    data: null,
                    type: DEVTOOLS_TYPE,
                    properties: {
                      label: ['edge.label', { ns: meta.profile.key }],
                      icon: 'ph--cloud--regular',
                    },
                    nodes: [
                      Node.make({
                        id: Devtools.Edge.Dashboard,
                        data: Devtools.Edge.Dashboard,
                        type: DEVTOOLS_TYPE,
                        properties: {
                          label: ['dashboard.label', { ns: meta.profile.key }],
                          icon: 'ph--computer-tower--regular',
                        },
                      }),
                      Node.make({
                        id: Devtools.Edge.Workflows,
                        data: Devtools.Edge.Workflows,
                        type: DEVTOOLS_TYPE,
                        properties: {
                          label: ['workflows.label', { ns: meta.profile.key }],
                          icon: 'ph--function--regular',
                        },
                      }),
                      Node.make({
                        id: Devtools.Edge.Traces,
                        data: Devtools.Edge.Traces,
                        type: DEVTOOLS_TYPE,
                        properties: {
                          label: ['traces.label', { ns: meta.profile.key }],
                          icon: 'ph--line-segments--regular',
                        },
                      }),
                      Node.make({
                        id: Devtools.Edge.Testing,
                        data: Devtools.Edge.Testing,
                        type: DEVTOOLS_TYPE,
                        properties: {
                          label: ['testing.label', { ns: meta.profile.key }],
                          icon: 'ph--flask--regular',
                        },
                      }),
                    ],
                  }),
                ],
              }),
            ];
          }),
      }),

      // Debug object companion.
      GraphBuilder.createExtension({
        id: 'debugObject',
        match: NodeMatcher.whenEchoObject,
        connector: () =>
          Effect.succeed([
            AppNode.makeCompanion({
              id: 'debug',
              label: ['debug.label', { ns: meta.profile.key }],
              icon: 'ph--bug--regular',
              data: 'debug',
              position: 'last',
            }),
          ]),
      }),

      // Devtools deck companion.
      GraphBuilder.createExtension({
        id: 'devtoolsOverview',
        match: NodeMatcher.whenRoot,
        connector: () =>
          Effect.succeed([
            AppNode.makeDeckCompanion({
              id: 'devtools',
              label: ['devtools-overview.label', { ns: meta.profile.key }],
              icon: 'ph--equalizer--regular',
              data: 'devtools' as const,
              position: 'last',
            }),
          ]),
      }),

      // Object explorer.
      GraphBuilder.createExtension({
        id: 'spaceObjects',
        match: NodeMatcher.whenRoot,
        connector: () =>
          Effect.succeed([
            AppNode.makeDeckCompanion({
              id: 'spaceObjects',
              label: ['space-objects.label', { ns: meta.profile.key }],
              icon: 'ph--cube--regular',
              data: 'space-objects' as const,
              position: 'last',
            }),
          ]),
      }),
    ]);

    return Capability.contributes(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
