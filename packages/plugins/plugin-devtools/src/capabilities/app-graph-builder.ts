//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, AppNode, AppNodeMatcher, Paths } from '@dxos/app-toolkit';
import { GraphBuilder, Node, NodeMatcher } from '@dxos/plugin-graph';
import { type Space } from '@dxos/react-client/echo';
import { Position } from '@dxos/util';

import { meta } from '#meta';
import { Devtools } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    // Read the app graph through its atom so the extension establishes a reactive dependency
    // and re-evaluates once the capability lands (dependency modules contribute individually,
    // not batched per wave).
    const appGraphAtom = yield* Capability.atom(AppCapabilities.AppGraph);

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
        match: NodeMatcher.whenAny(NodeMatcher.whenRoot, AppNodeMatcher.whenNavTreeGroup(Paths.GroupTypes.system)),
        connector: (_nodeOrSpace: Node.Node | Space, get) =>
          Effect.gen(function* () {
            const [graph] = get(appGraphAtom);

            return [
              Node.make({
                id: Devtools.nodeId(Devtools.id),
                data: null,
                type: Devtools.id,
                properties: {
                  label: ['devtools.label', { ns: meta.profile.key }],
                  icon: 'ph--toolbox--regular',
                  position: Position.last,
                },
                nodes: [
                  Node.make({
                    id: Devtools.nodeId(Devtools.AppGraph),
                    type: `${meta.profile.key}.app-graph`,
                    data: { graph: graph?.graph, root: Node.RootId },
                    properties: {
                      label: ['debug-app-graph.label', { ns: meta.profile.key }],
                      icon: 'ph--graph--regular',
                    },
                  }),
                  Node.make({
                    id: Devtools.nodeId(Devtools.ToolsExplorer),
                    data: Devtools.ToolsExplorer,
                    type: Devtools.id,
                    properties: {
                      label: ['debug-tools-explorer.label', { ns: meta.profile.key }],
                      icon: 'ph--toolbox--regular',
                    },
                  }),
                  Node.make({
                    id: Devtools.nodeId(Devtools.Client.id),
                    data: null,
                    type: Devtools.id,
                    properties: {
                      label: ['client.label', { ns: meta.profile.key }],
                      icon: 'ph--users--regular',
                    },
                    nodes: [
                      Node.make({
                        id: Devtools.nodeId(Devtools.Client.Config),
                        data: Devtools.Client.Config,
                        type: Devtools.id,
                        properties: {
                          label: ['config.label', { ns: meta.profile.key }],
                          icon: 'ph--gear--regular',
                        },
                      }),
                      Node.make({
                        id: Devtools.nodeId(Devtools.Client.Storage),
                        data: Devtools.Client.Storage,
                        type: Devtools.id,
                        properties: {
                          label: ['storage.label', { ns: meta.profile.key }],
                          icon: 'ph--hard-drives--regular',
                        },
                      }),
                      Node.make({
                        id: Devtools.nodeId(Devtools.Client.Sqlite),
                        data: Devtools.Client.Sqlite,
                        type: Devtools.id,
                        properties: {
                          label: ['sqlite.label', { ns: meta.profile.key }],
                          icon: 'ph--database--regular',
                        },
                      }),
                      Node.make({
                        id: Devtools.nodeId(Devtools.Client.Logs),
                        data: Devtools.Client.Logs,
                        type: Devtools.id,
                        properties: {
                          label: ['logs.label', { ns: meta.profile.key }],
                          icon: 'ph--file-text--regular',
                        },
                      }),
                      Node.make({
                        id: Devtools.nodeId(Devtools.Client.Diagnostics),
                        data: Devtools.Client.Diagnostics,
                        type: Devtools.id,
                        properties: {
                          label: ['diagnostics.label', { ns: meta.profile.key }],
                          icon: 'ph--chart-line--regular',
                        },
                      }),
                    ],
                  }),
                  Node.make({
                    id: Devtools.nodeId(Devtools.Halo.id),
                    data: null,
                    type: Devtools.id,
                    properties: {
                      label: ['halo.label', { ns: meta.profile.key }],
                      icon: 'ph--identification-badge--regular',
                    },
                    nodes: [
                      Node.make({
                        id: Devtools.nodeId(Devtools.Halo.Identity),
                        data: Devtools.Halo.Identity,
                        type: Devtools.id,
                        properties: {
                          label: ['identity.label', { ns: meta.profile.key }],
                          icon: 'ph--identification-badge--regular',
                        },
                      }),
                      Node.make({
                        id: Devtools.nodeId(Devtools.Halo.Devices),
                        data: Devtools.Halo.Devices,
                        type: Devtools.id,
                        properties: {
                          label: ['devices.label', { ns: meta.profile.key }],
                          icon: 'ph--devices--regular',
                        },
                      }),
                      Node.make({
                        id: Devtools.nodeId(Devtools.Halo.Keyring),
                        data: Devtools.Halo.Keyring,
                        type: Devtools.id,
                        properties: {
                          label: ['keyring.label', { ns: meta.profile.key }],
                          icon: 'ph--key--regular',
                        },
                      }),
                      Node.make({
                        id: Devtools.nodeId(Devtools.Halo.Credentials),
                        data: Devtools.Halo.Credentials,
                        type: Devtools.id,
                        properties: {
                          label: ['credentials.label', { ns: meta.profile.key }],
                          icon: 'ph--credit-card--regular',
                        },
                      }),
                    ],
                  }),
                  Node.make({
                    id: Devtools.nodeId(Devtools.Echo.id),
                    data: null,
                    type: Devtools.id,
                    properties: {
                      label: ['echo.label', { ns: meta.profile.key }],
                      icon: 'ph--database--regular',
                    },
                    nodes: [
                      Node.make({
                        id: Devtools.nodeId(Devtools.Echo.Spaces),
                        data: Devtools.Echo.Spaces,
                        type: Devtools.id,
                        properties: {
                          label: ['spaces.label', { ns: meta.profile.key }],
                          icon: 'ph--graph--regular',
                        },
                      }),
                      Node.make({
                        id: Devtools.nodeId(Devtools.Echo.Space),
                        data: Devtools.Echo.Space,
                        type: Devtools.id,
                        properties: {
                          label: ['space.label', { ns: meta.profile.key }],
                          icon: 'ph--planet--regular',
                        },
                      }),
                      Node.make({
                        id: Devtools.nodeId(Devtools.Echo.Feeds),
                        data: Devtools.Echo.Feeds,
                        type: Devtools.id,
                        properties: {
                          label: ['feeds.label', { ns: meta.profile.key }],
                          icon: 'ph--list-bullets--regular',
                        },
                      }),
                      Node.make({
                        id: Devtools.nodeId(Devtools.Echo.Objects),
                        data: Devtools.Echo.Objects,
                        type: Devtools.id,
                        properties: {
                          label: ['objects.label', { ns: meta.profile.key }],
                          icon: 'ph--cube--regular',
                        },
                      }),
                      Node.make({
                        id: Devtools.nodeId(Devtools.Echo.Schema),
                        data: Devtools.Echo.Schema,
                        type: Devtools.id,
                        properties: {
                          label: ['schema.label', { ns: meta.profile.key }],
                          icon: 'ph--database--regular',
                        },
                      }),
                      Node.make({
                        id: Devtools.nodeId(Devtools.Echo.Registry),
                        data: Devtools.Echo.Registry,
                        type: Devtools.id,
                        properties: {
                          label: ['registry.label', { ns: meta.profile.key }],
                          icon: 'ph--books--regular',
                        },
                      }),
                      Node.make({
                        id: Devtools.nodeId(Devtools.Echo.Automerge),
                        data: Devtools.Echo.Automerge,
                        type: Devtools.id,
                        properties: {
                          label: ['automerge.label', { ns: meta.profile.key }],
                          icon: 'ph--gear-six--regular',
                        },
                      }),
                      Node.make({
                        id: Devtools.nodeId(Devtools.Echo.Queues),
                        data: Devtools.Echo.Queues,
                        type: Devtools.id,
                        properties: {
                          label: ['queues.label', { ns: meta.profile.key }],
                          icon: 'ph--queue--regular',
                        },
                      }),
                      Node.make({
                        id: Devtools.nodeId(Devtools.Echo.Members),
                        data: Devtools.Echo.Members,
                        type: Devtools.id,
                        properties: {
                          label: ['members.label', { ns: meta.profile.key }],
                          icon: 'ph--users--regular',
                        },
                      }),
                      Node.make({
                        id: Devtools.nodeId(Devtools.Echo.Metadata),
                        data: Devtools.Echo.Metadata,
                        type: Devtools.id,
                        properties: {
                          label: ['metadata.label', { ns: meta.profile.key }],
                          icon: 'ph--hard-drive--regular',
                        },
                      }),
                    ],
                  }),
                  Node.make({
                    id: Devtools.nodeId(Devtools.Mesh.id),
                    data: null,
                    type: Devtools.id,
                    properties: {
                      label: ['mesh.label', { ns: meta.profile.key }],
                      icon: 'ph--graph--regular',
                    },
                    nodes: [
                      Node.make({
                        id: Devtools.nodeId(Devtools.Mesh.Signal),
                        data: Devtools.Mesh.Signal,
                        type: Devtools.id,
                        properties: {
                          label: ['signal.label', { ns: meta.profile.key }],
                          icon: 'ph--wifi-high--regular',
                        },
                      }),
                      Node.make({
                        id: Devtools.nodeId(Devtools.Mesh.Swarm),
                        data: Devtools.Mesh.Swarm,
                        type: Devtools.id,
                        properties: {
                          label: ['swarm.label', { ns: meta.profile.key }],
                          icon: 'ph--users-three--regular',
                        },
                      }),
                      Node.make({
                        id: Devtools.nodeId(Devtools.Mesh.Network),
                        data: Devtools.Mesh.Network,
                        type: Devtools.id,
                        properties: {
                          label: ['network.label', { ns: meta.profile.key }],
                          icon: 'ph--polygon--regular',
                        },
                      }),
                    ],
                  }),
                  Node.make({
                    id: Devtools.nodeId(Devtools.Edge.id),
                    data: null,
                    type: Devtools.id,
                    properties: {
                      label: ['edge.label', { ns: meta.profile.key }],
                      icon: 'ph--cloud--regular',
                    },
                    nodes: [
                      Node.make({
                        id: Devtools.nodeId(Devtools.Edge.Dashboard),
                        data: Devtools.Edge.Dashboard,
                        type: Devtools.id,
                        properties: {
                          label: ['dashboard.label', { ns: meta.profile.key }],
                          icon: 'ph--computer-tower--regular',
                        },
                      }),
                      Node.make({
                        id: Devtools.nodeId(Devtools.Edge.Workflows),
                        data: Devtools.Edge.Workflows,
                        type: Devtools.id,
                        properties: {
                          label: ['workflows.label', { ns: meta.profile.key }],
                          icon: 'ph--function--regular',
                        },
                      }),
                      Node.make({
                        id: Devtools.nodeId(Devtools.Edge.Traces),
                        data: Devtools.Edge.Traces,
                        type: Devtools.id,
                        properties: {
                          label: ['traces.label', { ns: meta.profile.key }],
                          icon: 'ph--line-segments--regular',
                        },
                      }),
                      Node.make({
                        id: Devtools.nodeId(Devtools.Edge.Testing),
                        data: Devtools.Edge.Testing,
                        type: Devtools.id,
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

      // Devtools deck companion.
      GraphBuilder.createExtension({
        id: 'devtoolsOverview',
        match: NodeMatcher.whenRoot,
        connector: () =>
          Effect.succeed([
            AppNode.makeDeckCompanion({
              id: 'devtoolsOverview',
              label: ['devtools-overview.label', { ns: meta.profile.key }],
              icon: 'ph--equalizer--regular',
              data: 'devtoolsOverview' as const,
              position: Position.last,
            }),
          ]),
      }),
    ]);

    return Capability.provide(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
