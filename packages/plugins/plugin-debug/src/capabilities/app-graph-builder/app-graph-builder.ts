//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, getSpaceIdFromPath } from '@dxos/app-toolkit';
import { ClientCapabilities } from '@dxos/plugin-client';
import { DECK_COMPANION_TYPE, PLANK_COMPANION_TYPE } from '@dxos/plugin-deck/types';
import { GraphBuilder, Node, NodeMatcher } from '@dxos/plugin-graph';
import { meta as spaceMeta } from '@dxos/plugin-space';

import { meta } from '../../meta';
import { Devtools } from '../../types';
import { getParentId } from '@dxos/react-ui-attention';

const DEVTOOLS_TYPE = `${meta.id}.devtools`;

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const extensions = yield* Effect.all([
      // Devtools node.
      GraphBuilder.createExtension({
        id: `${meta.id}.devtools`,
        match: NodeMatcher.whenAny(NodeMatcher.whenRoot, NodeMatcher.whenNodeType(`${spaceMeta.id}.settings`)),
        connector: (node, get) =>
          Effect.gen(function* () {
            const client = yield* Capability.get(ClientCapabilities.Client);
            const layoutAtom = get(yield* Capability.atom(AppCapabilities.Layout))[0];
            const layout = layoutAtom ? get(layoutAtom) : undefined;
            const spaceId = layout?.workspace ? getSpaceIdFromPath(layout.workspace) : undefined;
            const space = spaceId ? client.spaces.get(spaceId) : undefined;
            const [graph] = get(yield* Capability.atom(AppCapabilities.AppGraph));

            return [
              {
                id: Devtools.id,
                data: null,
                type: DEVTOOLS_TYPE,
                properties: {
                  label: ['devtools.label', { ns: meta.id }],
                  icon: 'ph--hammer--regular',
                  disposition: 'pin-end',
                  position: 'fallback',
                },
                nodes: [
                  ...(space && node.type === `${spaceMeta.id}.settings`
                    ? [
                        {
                          id: 'debug',
                          type: `${meta.id}.space`,
                          data: { space, type: `${meta.id}.space` },
                          properties: {
                            label: ['debug.label', { ns: meta.id }],
                            icon: 'ph--bug--regular',
                          },
                        },
                      ]
                    : []),
                  {
                    id: 'app-graph',
                    type: `${meta.id}.app-graph`,
                    data: { graph: graph?.graph, root: node.id === Node.RootId ? node.id : getParentId(node.id) },
                    properties: {
                      label: ['debug-app-graph.label', { ns: meta.id }],
                      icon: 'ph--graph--regular',
                    },
                  },
                  {
                    id: Devtools.Client.id,
                    data: null,
                    type: DEVTOOLS_TYPE,
                    properties: {
                      label: ['client.label', { ns: meta.id }],
                      icon: 'ph--users--regular',
                    },
                    nodes: [
                      {
                        id: Devtools.Client.Config,
                        data: Devtools.Client.Config,
                        type: DEVTOOLS_TYPE,
                        properties: {
                          label: ['config.label', { ns: meta.id }],
                          icon: 'ph--gear--regular',
                        },
                      },
                      {
                        id: Devtools.Client.Storage,
                        data: Devtools.Client.Storage,
                        type: DEVTOOLS_TYPE,
                        properties: {
                          label: ['storage.label', { ns: meta.id }],
                          icon: 'ph--hard-drives--regular',
                        },
                      },
                      {
                        id: Devtools.Client.Logs,
                        data: Devtools.Client.Logs,
                        type: DEVTOOLS_TYPE,
                        properties: {
                          label: ['logs.label', { ns: meta.id }],
                          icon: 'ph--file-text--regular',
                        },
                      },
                      {
                        id: Devtools.Client.Diagnostics,
                        data: Devtools.Client.Diagnostics,
                        type: DEVTOOLS_TYPE,
                        properties: {
                          label: ['diagnostics.label', { ns: meta.id }],
                          icon: 'ph--chart-line--regular',
                        },
                      },
                    ],
                  },
                  {
                    id: Devtools.Halo.id,
                    data: null,
                    type: DEVTOOLS_TYPE,
                    properties: {
                      label: ['halo.label', { ns: meta.id }],
                      icon: 'ph--identification-badge--regular',
                    },
                    nodes: [
                      {
                        id: Devtools.Halo.Identity,
                        data: Devtools.Halo.Identity,
                        type: DEVTOOLS_TYPE,
                        properties: {
                          label: ['identity.label', { ns: meta.id }],
                          icon: 'ph--identification-badge--regular',
                        },
                      },
                      {
                        id: Devtools.Halo.Devices,
                        data: Devtools.Halo.Devices,
                        type: DEVTOOLS_TYPE,
                        properties: {
                          label: ['devices.label', { ns: meta.id }],
                          icon: 'ph--devices--regular',
                        },
                      },
                      {
                        id: Devtools.Halo.Keyring,
                        data: Devtools.Halo.Keyring,
                        type: DEVTOOLS_TYPE,
                        properties: {
                          label: ['keyring.label', { ns: meta.id }],
                          icon: 'ph--key--regular',
                        },
                      },
                      {
                        id: Devtools.Halo.Credentials,
                        data: Devtools.Halo.Credentials,
                        type: DEVTOOLS_TYPE,
                        properties: {
                          label: ['credentials.label', { ns: meta.id }],
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
                      label: ['echo.label', { ns: meta.id }],
                      icon: 'ph--database--regular',
                    },
                    nodes: [
                      {
                        id: Devtools.Echo.Spaces,
                        data: Devtools.Echo.Spaces,
                        type: DEVTOOLS_TYPE,
                        properties: {
                          label: ['spaces.label', { ns: meta.id }],
                          icon: 'ph--graph--regular',
                        },
                      },
                      {
                        id: Devtools.Echo.Space,
                        data: Devtools.Echo.Space,
                        type: DEVTOOLS_TYPE,
                        properties: {
                          label: ['space.label', { ns: meta.id }],
                          icon: 'ph--planet--regular',
                        },
                      },
                      {
                        id: Devtools.Echo.Feeds,
                        data: Devtools.Echo.Feeds,
                        type: DEVTOOLS_TYPE,
                        properties: {
                          label: ['feeds.label', { ns: meta.id }],
                          icon: 'ph--list-bullets--regular',
                        },
                      },
                      {
                        id: Devtools.Echo.Objects,
                        data: Devtools.Echo.Objects,
                        type: DEVTOOLS_TYPE,
                        properties: {
                          label: ['objects.label', { ns: meta.id }],
                          icon: 'ph--cube--regular',
                        },
                      },
                      {
                        id: Devtools.Echo.Schema,
                        data: Devtools.Echo.Schema,
                        type: DEVTOOLS_TYPE,
                        properties: {
                          label: ['schema.label', { ns: meta.id }],
                          icon: 'ph--database--regular',
                        },
                      },
                      {
                        id: Devtools.Echo.Automerge,
                        data: Devtools.Echo.Automerge,
                        type: DEVTOOLS_TYPE,
                        properties: {
                          label: ['automerge.label', { ns: meta.id }],
                          icon: 'ph--gear-six--regular',
                        },
                      },
                      {
                        id: Devtools.Echo.Queues,
                        data: Devtools.Echo.Queues,
                        type: DEVTOOLS_TYPE,
                        properties: {
                          label: ['queues.label', { ns: meta.id }],
                          icon: 'ph--queue--regular',
                        },
                      },
                      {
                        id: Devtools.Echo.Members,
                        data: Devtools.Echo.Members,
                        type: DEVTOOLS_TYPE,
                        properties: {
                          label: ['members.label', { ns: meta.id }],
                          icon: 'ph--users--regular',
                        },
                      },
                      {
                        id: Devtools.Echo.Metadata,
                        data: Devtools.Echo.Metadata,
                        type: DEVTOOLS_TYPE,
                        properties: {
                          label: ['metadata.label', { ns: meta.id }],
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
                      label: ['mesh.label', { ns: meta.id }],
                      icon: 'ph--graph--regular',
                    },
                    nodes: [
                      {
                        id: Devtools.Mesh.Signal,
                        data: Devtools.Mesh.Signal,
                        type: DEVTOOLS_TYPE,
                        properties: {
                          label: ['signal.label', { ns: meta.id }],
                          icon: 'ph--wifi-high--regular',
                        },
                      },
                      {
                        id: Devtools.Mesh.Swarm,
                        data: Devtools.Mesh.Swarm,
                        type: DEVTOOLS_TYPE,
                        properties: {
                          label: ['swarm.label', { ns: meta.id }],
                          icon: 'ph--users-three--regular',
                        },
                      },
                      {
                        id: Devtools.Mesh.Network,
                        data: Devtools.Mesh.Network,
                        type: DEVTOOLS_TYPE,
                        properties: {
                          label: ['network.label', { ns: meta.id }],
                          icon: 'ph--polygon--regular',
                        },
                      },
                    ],
                  },
                  {
                    id: Devtools.Edge.id,
                    data: null,
                    type: DEVTOOLS_TYPE,
                    properties: {
                      label: ['edge.label', { ns: meta.id }],
                      icon: 'ph--cloud--regular',
                    },
                    nodes: [
                      {
                        id: Devtools.Edge.Dashboard,
                        data: Devtools.Edge.Dashboard,
                        type: DEVTOOLS_TYPE,
                        properties: {
                          label: ['dashboard.label', { ns: meta.id }],
                          icon: 'ph--computer-tower--regular',
                        },
                      },
                      {
                        id: Devtools.Edge.Workflows,
                        data: Devtools.Edge.Workflows,
                        type: DEVTOOLS_TYPE,
                        properties: {
                          label: ['workflows.label', { ns: meta.id }],
                          icon: 'ph--function--regular',
                        },
                      },
                      {
                        id: Devtools.Edge.Traces,
                        data: Devtools.Edge.Traces,
                        type: DEVTOOLS_TYPE,
                        properties: {
                          label: ['traces.label', { ns: meta.id }],
                          icon: 'ph--line-segments--regular',
                        },
                      },
                      {
                        id: Devtools.Edge.Testing,
                        data: Devtools.Edge.Testing,
                        type: DEVTOOLS_TYPE,
                        properties: {
                          label: ['testing.label', { ns: meta.id }],
                          icon: 'ph--flask--regular',
                        },
                      },
                    ],
                  },
                ],
              },
            ];
          }),
      }),

      // Debug object companion.
      GraphBuilder.createExtension({
        id: `${meta.id}.debug-object`,
        match: NodeMatcher.whenEchoObject,
        connector: () =>
          Effect.succeed([
            {
              id: 'debug',
              type: PLANK_COMPANION_TYPE,
              data: 'debug',
              properties: {
                label: ['debug.label', { ns: meta.id }],
                icon: 'ph--bug--regular',
                disposition: 'hidden',
                position: 'fallback',
              },
            },
          ]),
      }),

      // Devtools deck companion.
      GraphBuilder.createExtension({
        id: `${meta.id}.devtools-overview`,
        match: NodeMatcher.whenRoot,
        connector: () =>
          Effect.succeed([
            {
              id: 'devtools',
              type: DECK_COMPANION_TYPE,
              data: 'devtools' as const,
              properties: {
                label: ['devtools-overview.label', { ns: meta.id }],
                icon: 'ph--equalizer--regular',
                disposition: 'hidden',
                position: 'fallback',
              },
            },
          ]),
      }),

      // Object explorer.
      GraphBuilder.createExtension({
        id: `${meta.id}.space-objects`,
        match: NodeMatcher.whenRoot,
        connector: () =>
          Effect.succeed([
            {
              id: 'space-objects',
              type: DECK_COMPANION_TYPE,
              data: 'space-objects' as const,
              properties: {
                label: ['space-objects.label', { ns: meta.id }],
                icon: 'ph--cube--regular',
                disposition: 'hidden',
                position: 'fallback',
              },
            },
          ]),
      }),
    ]);

    return Capability.contributes(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
