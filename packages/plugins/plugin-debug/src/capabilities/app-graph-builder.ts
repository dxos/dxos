//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import * as Function from 'effect/Function';
import * as Option from 'effect/Option';

import { Capabilities, type PluginContext, contributes, defineCapabilityModule } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';
import { ATTENDABLE_PATH_SEPARATOR, DECK_COMPANION_TYPE, PLANK_COMPANION_TYPE } from '@dxos/plugin-deck/types';
import { ROOT_ID, atomFromSignal, createExtension } from '@dxos/plugin-graph';
import { getActiveSpace, meta as spaceMeta } from '@dxos/plugin-space';

import { meta } from '../meta';
import { Devtools } from '../types';

const DEVTOOLS_TYPE = `${meta.id}/devtools`;

export default defineCapabilityModule((context: PluginContext) =>
  contributes(Capabilities.AppGraphBuilder, [
    // Devtools node.
    createExtension({
      id: `${meta.id}/devtools`,
      connector: (node) =>
        Atom.make((get) =>
          Function.pipe(
            get(node),
            Option.flatMap((node) =>
              node.id === ROOT_ID || node.type === `${spaceMeta.id}/settings` ? Option.some(node) : Option.none(),
            ),
            Option.map((node) => {
              const space = get(atomFromSignal(() => getActiveSpace(context)));
              const [graph] = get(context.capabilities(Capabilities.AppGraph));

              return [
                {
                  id: `${Devtools.id}-${node.id}`,
                  data: null,
                  type: DEVTOOLS_TYPE,
                  properties: {
                    label: ['devtools label', { ns: meta.id }],
                    icon: 'ph--hammer--regular',
                    disposition: 'pin-end',
                    position: 'fallback',
                  },
                  nodes: [
                    ...(space && node.type === `${spaceMeta.id}/settings`
                      ? [
                          {
                            id: `debug-${node.id}`,
                            type: `${meta.id}/space`,
                            data: { space, type: `${meta.id}/space` },
                            properties: {
                              label: ['debug label', { ns: meta.id }],
                              icon: 'ph--bug--regular',
                            },
                          },
                        ]
                      : []),
                    {
                      id: `app-graph-${node.id}`,
                      type: `${meta.id}/app-graph`,
                      data: { graph: graph?.graph, root: space ? space.id : ROOT_ID },
                      properties: {
                        label: ['debug app graph label', { ns: meta.id }],
                        icon: 'ph--graph--regular',
                      },
                    },
                    {
                      id: `${Devtools.Client.id}-${node.id}`,
                      data: null,
                      type: DEVTOOLS_TYPE,
                      properties: {
                        label: ['client label', { ns: meta.id }],
                        icon: 'ph--users--regular',
                      },
                      nodes: [
                        {
                          id: `${Devtools.Client.Config}-${node.id}`,
                          data: Devtools.Client.Config,
                          type: DEVTOOLS_TYPE,
                          properties: {
                            label: ['config label', { ns: meta.id }],
                            icon: 'ph--gear--regular',
                          },
                        },
                        {
                          id: `${Devtools.Client.Storage}-${node.id}`,
                          data: Devtools.Client.Storage,
                          type: DEVTOOLS_TYPE,
                          properties: {
                            label: ['storage label', { ns: meta.id }],
                            icon: 'ph--hard-drives--regular',
                          },
                        },
                        {
                          id: `${Devtools.Client.Logs}-${node.id}`,
                          data: Devtools.Client.Logs,
                          type: DEVTOOLS_TYPE,
                          properties: {
                            label: ['logs label', { ns: meta.id }],
                            icon: 'ph--file-text--regular',
                          },
                        },
                        {
                          id: `${Devtools.Client.Diagnostics}-${node.id}`,
                          data: Devtools.Client.Diagnostics,
                          type: DEVTOOLS_TYPE,
                          properties: {
                            label: ['diagnostics label', { ns: meta.id }],
                            icon: 'ph--chart-line--regular',
                          },
                        },
                        {
                          id: `${Devtools.Client.Tracing}-${node.id}`,
                          data: Devtools.Client.Tracing,
                          type: DEVTOOLS_TYPE,
                          properties: {
                            label: ['tracing label', { ns: meta.id }],
                            icon: 'ph--fire--regular',
                          },
                        },
                      ],
                    },
                    {
                      id: `${Devtools.Halo.id}-${node.id}`,
                      data: null,
                      type: DEVTOOLS_TYPE,
                      properties: {
                        label: ['halo label', { ns: meta.id }],
                        icon: 'ph--identification-badge--regular',
                      },
                      nodes: [
                        {
                          id: `${Devtools.Halo.Identity}-${node.id}`,
                          data: Devtools.Halo.Identity,
                          type: DEVTOOLS_TYPE,
                          properties: {
                            label: ['identity label', { ns: meta.id }],
                            icon: 'ph--identification-badge--regular',
                          },
                        },
                        {
                          id: `${Devtools.Halo.Devices}-${node.id}`,
                          data: Devtools.Halo.Devices,
                          type: DEVTOOLS_TYPE,
                          properties: {
                            label: ['devices label', { ns: meta.id }],
                            icon: 'ph--devices--regular',
                          },
                        },
                        {
                          id: `${Devtools.Halo.Keyring}-${node.id}`,
                          data: Devtools.Halo.Keyring,
                          type: DEVTOOLS_TYPE,
                          properties: {
                            label: ['keyring label', { ns: meta.id }],
                            icon: 'ph--key--regular',
                          },
                        },
                        {
                          id: `${Devtools.Halo.Credentials}-${node.id}`,
                          data: Devtools.Halo.Credentials,
                          type: DEVTOOLS_TYPE,
                          properties: {
                            label: ['credentials label', { ns: meta.id }],
                            icon: 'ph--credit-card--regular',
                          },
                        },
                      ],
                    },
                    {
                      id: `${Devtools.Echo.id}-${node.id}`,
                      data: null,
                      type: DEVTOOLS_TYPE,
                      properties: {
                        label: ['echo label', { ns: meta.id }],
                        icon: 'ph--database--regular',
                      },
                      nodes: [
                        {
                          id: `${Devtools.Echo.Spaces}-${node.id}`,
                          data: Devtools.Echo.Spaces,
                          type: DEVTOOLS_TYPE,
                          properties: {
                            label: ['spaces label', { ns: meta.id }],
                            icon: 'ph--graph--regular',
                          },
                        },
                        {
                          id: `${Devtools.Echo.Space}-${node.id}`,
                          data: Devtools.Echo.Space,
                          type: DEVTOOLS_TYPE,
                          properties: {
                            label: ['space label', { ns: meta.id }],
                            icon: 'ph--planet--regular',
                          },
                        },
                        {
                          id: `${Devtools.Echo.Feeds}-${node.id}`,
                          data: Devtools.Echo.Feeds,
                          type: DEVTOOLS_TYPE,
                          properties: {
                            label: ['feeds label', { ns: meta.id }],
                            icon: 'ph--list-bullets--regular',
                          },
                        },
                        {
                          id: `${Devtools.Echo.Objects}-${node.id}`,
                          data: Devtools.Echo.Objects,
                          type: DEVTOOLS_TYPE,
                          properties: {
                            label: ['objects label', { ns: meta.id }],
                            icon: 'ph--cube--regular',
                          },
                        },
                        {
                          id: `${Devtools.Echo.Schema}-${node.id}`,
                          data: Devtools.Echo.Schema,
                          type: DEVTOOLS_TYPE,
                          properties: {
                            label: ['schema label', { ns: meta.id }],
                            icon: 'ph--database--regular',
                          },
                        },
                        {
                          id: `${Devtools.Echo.Automerge}-${node.id}`,
                          data: Devtools.Echo.Automerge,
                          type: DEVTOOLS_TYPE,
                          properties: {
                            label: ['automerge label', { ns: meta.id }],
                            icon: 'ph--gear-six--regular',
                          },
                        },
                        {
                          id: `${Devtools.Echo.Queues}-${node.id}`,
                          data: Devtools.Echo.Queues,
                          type: DEVTOOLS_TYPE,
                          properties: {
                            label: ['queues label', { ns: meta.id }],
                            icon: 'ph--queue--regular',
                          },
                        },
                        {
                          id: `${Devtools.Echo.Members}-${node.id}`,
                          data: Devtools.Echo.Members,
                          type: DEVTOOLS_TYPE,
                          properties: {
                            label: ['members label', { ns: meta.id }],
                            icon: 'ph--users--regular',
                          },
                        },
                        {
                          id: `${Devtools.Echo.Metadata}-${node.id}`,
                          data: Devtools.Echo.Metadata,
                          type: DEVTOOLS_TYPE,
                          properties: {
                            label: ['metadata label', { ns: meta.id }],
                            icon: 'ph--hard-drive--regular',
                          },
                        },
                      ],
                    },
                    {
                      id: `${Devtools.Mesh.id}-${node.id}`,
                      data: null,
                      type: DEVTOOLS_TYPE,
                      properties: {
                        label: ['mesh label', { ns: meta.id }],
                        icon: 'ph--graph--regular',
                      },
                      nodes: [
                        {
                          id: `${Devtools.Mesh.Signal}-${node.id}`,
                          data: Devtools.Mesh.Signal,
                          type: DEVTOOLS_TYPE,
                          properties: {
                            label: ['signal label', { ns: meta.id }],
                            icon: 'ph--wifi-high--regular',
                          },
                        },
                        {
                          id: `${Devtools.Mesh.Swarm}-${node.id}`,
                          data: Devtools.Mesh.Swarm,
                          type: DEVTOOLS_TYPE,
                          properties: {
                            label: ['swarm label', { ns: meta.id }],
                            icon: 'ph--users-three--regular',
                          },
                        },
                        {
                          id: `${Devtools.Mesh.Network}-${node.id}`,
                          data: Devtools.Mesh.Network,
                          type: DEVTOOLS_TYPE,
                          properties: {
                            label: ['network label', { ns: meta.id }],
                            icon: 'ph--polygon--regular',
                          },
                        },
                      ],
                    },
                    // TODO(wittjosiah): Remove?
                    // {
                    //   id: `${prefix}-${Devtools.Agent.id}`,
                    //   data: null,
                    //   type: DEVTOOLS_TYPE,
                    //   properties: {
                    //     label: ['agent label', { ns: meta.id }],
                    //     icon: 'ph--robot--regular',
                    //   },
                    //   nodes: [
                    //     {
                    //       id: `${prefix}-${Devtools.Agent.Dashboard}`,
                    //       data: Devtools.Agent.Dashboard,
                    //       type: DEVTOOLS_TYPE,
                    //       properties: {
                    //         label: ['dashboard label', { ns: meta.id }],
                    //         icon: 'ph--computer-tower--regular',
                    //       },
                    //     },
                    //   ],
                    // },
                    {
                      id: `${Devtools.Edge.id}-${node.id}`,
                      data: null,
                      type: DEVTOOLS_TYPE,
                      properties: {
                        label: ['edge label', { ns: meta.id }],
                        icon: 'ph--cloud--regular',
                      },
                      nodes: [
                        {
                          id: `${Devtools.Edge.Dashboard}-${node.id}`,
                          data: Devtools.Edge.Dashboard,
                          type: DEVTOOLS_TYPE,
                          properties: {
                            label: ['dashboard label', { ns: meta.id }],
                            icon: 'ph--computer-tower--regular',
                          },
                        },
                        {
                          id: `${Devtools.Edge.Workflows}-${node.id}`,
                          data: Devtools.Edge.Workflows,
                          type: DEVTOOLS_TYPE,
                          properties: {
                            label: ['workflows label', { ns: meta.id }],
                            icon: 'ph--function--regular',
                          },
                        },
                        {
                          id: `${Devtools.Edge.Traces}-${node.id}`,
                          data: Devtools.Edge.Traces,
                          type: DEVTOOLS_TYPE,
                          properties: {
                            label: ['traces label', { ns: meta.id }],
                            icon: 'ph--line-segments--regular',
                          },
                        },
                        {
                          id: `${Devtools.Edge.Testing}-${node.id}`,
                          data: Devtools.Edge.Testing,
                          type: DEVTOOLS_TYPE,
                          properties: {
                            label: ['testing label', { ns: meta.id }],
                            icon: 'ph--flask--regular',
                          },
                        },
                      ],
                    },
                  ],
                },
              ];
            }),
            Option.getOrElse(() => []),
          ),
        ),
    }),

    // Debug object companion.
    createExtension({
      id: `${meta.id}/debug-object`,
      connector: (node) =>
        Atom.make((get) =>
          Function.pipe(
            get(node),
            Option.flatMap((node) => (Obj.isObject(node.data) ? Option.some(node) : Option.none())),
            Option.map((node) => [
              {
                id: [node.id, 'debug'].join(ATTENDABLE_PATH_SEPARATOR),
                type: PLANK_COMPANION_TYPE,
                data: 'debug',
                properties: {
                  label: ['debug label', { ns: meta.id }],
                  icon: 'ph--bug--regular',
                  disposition: 'hidden',
                  position: 'fallback',
                },
              },
            ]),
            Option.getOrElse(() => []),
          ),
        ),
    }),

    // Devtools deck companion.
    createExtension({
      id: `${meta.id}/devtools-overview`,
      connector: (node) =>
        Atom.make((get) =>
          Function.pipe(
            get(node),
            Option.flatMap((node) => (node.id === ROOT_ID ? Option.some(node) : Option.none())),
            Option.map((node) => [
              {
                id: [node.id, 'devtools'].join(ATTENDABLE_PATH_SEPARATOR),
                type: DECK_COMPANION_TYPE,
                data: null,
                properties: {
                  label: ['devtools overview label', { ns: meta.id }],
                  icon: 'ph--equalizer--regular',
                  disposition: 'hidden',
                  position: 'fallback',
                },
              },
            ]),
            Option.getOrElse(() => []),
          ),
        ),
    }),
  ]));
