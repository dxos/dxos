//
// Copyright 2025 DXOS.org
//

import { Rx } from '@effect-rx/rx-react';
import { Option, pipe } from 'effect';

import { contributes, Capabilities, type PluginContext } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';
import { ATTENDABLE_PATH_SEPARATOR, DECK_COMPANION_TYPE, PLANK_COMPANION_TYPE } from '@dxos/plugin-deck/types';
import { createExtension, ROOT_ID, rxFromSignal } from '@dxos/plugin-graph';
import { getActiveSpace, SPACE_PLUGIN } from '@dxos/plugin-space';

import { DEBUG_PLUGIN } from '../meta';
import { Devtools } from '../types';

const DEVTOOLS_TYPE = 'dxos.org/plugin/debug/devtools';

export default (context: PluginContext) =>
  contributes(Capabilities.AppGraphBuilder, [
    // Devtools node.
    createExtension({
      id: 'dxos.org/plugin/debug/devtools',
      connector: (node) =>
        Rx.make((get) =>
          pipe(
            get(node),
            Option.flatMap((node) =>
              node.id === ROOT_ID || node.type === `${SPACE_PLUGIN}/settings` ? Option.some(node) : Option.none(),
            ),
            Option.map((node) => {
              const space = get(rxFromSignal(() => getActiveSpace(context)));

              return [
                {
                  id: `${Devtools.id}-${node.id}`,
                  data: null,
                  type: DEVTOOLS_TYPE,
                  properties: {
                    label: ['devtools label', { ns: DEBUG_PLUGIN }],
                    icon: 'ph--hammer--regular',
                    disposition: 'pin-end',
                    position: 'fallback',
                  },
                  nodes: [
                    ...(space && node.type === `${SPACE_PLUGIN}/settings`
                      ? [
                          {
                            id: `debug-${node.id}`,
                            type: 'dxos.org/plugin/debug/space',
                            data: { space, type: 'dxos.org/plugin/debug/space' },
                            properties: {
                              label: ['debug label', { ns: DEBUG_PLUGIN }],
                              icon: 'ph--bug--regular',
                            },
                          },
                        ]
                      : []),
                    {
                      id: `${Devtools.Client.id}-${node.id}`,
                      data: null,
                      type: DEVTOOLS_TYPE,
                      properties: {
                        label: ['client label', { ns: DEBUG_PLUGIN }],
                        icon: 'ph--users--regular',
                      },
                      nodes: [
                        {
                          id: `${Devtools.Client.Config}-${node.id}`,
                          data: Devtools.Client.Config,
                          type: DEVTOOLS_TYPE,
                          properties: {
                            label: ['config label', { ns: DEBUG_PLUGIN }],
                            icon: 'ph--gear--regular',
                          },
                        },
                        {
                          id: `${Devtools.Client.Storage}-${node.id}`,
                          data: Devtools.Client.Storage,
                          type: DEVTOOLS_TYPE,
                          properties: {
                            label: ['storage label', { ns: DEBUG_PLUGIN }],
                            icon: 'ph--hard-drives--regular',
                          },
                        },
                        {
                          id: `${Devtools.Client.Logs}-${node.id}`,
                          data: Devtools.Client.Logs,
                          type: DEVTOOLS_TYPE,
                          properties: {
                            label: ['logs label', { ns: DEBUG_PLUGIN }],
                            icon: 'ph--file-text--regular',
                          },
                        },
                        {
                          id: `${Devtools.Client.Diagnostics}-${node.id}`,
                          data: Devtools.Client.Diagnostics,
                          type: DEVTOOLS_TYPE,
                          properties: {
                            label: ['diagnostics label', { ns: DEBUG_PLUGIN }],
                            icon: 'ph--chart-line--regular',
                          },
                        },
                        {
                          id: `${Devtools.Client.Tracing}-${node.id}`,
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
                      id: `${Devtools.Halo.id}-${node.id}`,
                      data: null,
                      type: DEVTOOLS_TYPE,
                      properties: {
                        label: ['halo label', { ns: DEBUG_PLUGIN }],
                        icon: 'ph--identification-badge--regular',
                      },
                      nodes: [
                        {
                          id: `${Devtools.Halo.Identity}-${node.id}`,
                          data: Devtools.Halo.Identity,
                          type: DEVTOOLS_TYPE,
                          properties: {
                            label: ['identity label', { ns: DEBUG_PLUGIN }],
                            icon: 'ph--identification-badge--regular',
                          },
                        },
                        {
                          id: `${Devtools.Halo.Devices}-${node.id}`,
                          data: Devtools.Halo.Devices,
                          type: DEVTOOLS_TYPE,
                          properties: {
                            label: ['devices label', { ns: DEBUG_PLUGIN }],
                            icon: 'ph--devices--regular',
                          },
                        },
                        {
                          id: `${Devtools.Halo.Keyring}-${node.id}`,
                          data: Devtools.Halo.Keyring,
                          type: DEVTOOLS_TYPE,
                          properties: {
                            label: ['keyring label', { ns: DEBUG_PLUGIN }],
                            icon: 'ph--key--regular',
                          },
                        },
                        {
                          id: `${Devtools.Halo.Credentials}-${node.id}`,
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
                      id: `${Devtools.Echo.id}-${node.id}`,
                      data: null,
                      type: DEVTOOLS_TYPE,
                      properties: {
                        label: ['echo label', { ns: DEBUG_PLUGIN }],
                        icon: 'ph--database--regular',
                      },
                      nodes: [
                        {
                          id: `${Devtools.Echo.Spaces}-${node.id}`,
                          data: Devtools.Echo.Spaces,
                          type: DEVTOOLS_TYPE,
                          properties: {
                            label: ['spaces label', { ns: DEBUG_PLUGIN }],
                            icon: 'ph--graph--regular',
                          },
                        },
                        {
                          id: `${Devtools.Echo.Space}-${node.id}`,
                          data: Devtools.Echo.Space,
                          type: DEVTOOLS_TYPE,
                          properties: {
                            label: ['space label', { ns: DEBUG_PLUGIN }],
                            icon: 'ph--planet--regular',
                          },
                        },
                        {
                          id: `${Devtools.Echo.Feeds}-${node.id}`,
                          data: Devtools.Echo.Feeds,
                          type: DEVTOOLS_TYPE,
                          properties: {
                            label: ['feeds label', { ns: DEBUG_PLUGIN }],
                            icon: 'ph--list-bullets--regular',
                          },
                        },
                        {
                          id: `${Devtools.Echo.Objects}-${node.id}`,
                          data: Devtools.Echo.Objects,
                          type: DEVTOOLS_TYPE,
                          properties: {
                            label: ['objects label', { ns: DEBUG_PLUGIN }],
                            icon: 'ph--cube--regular',
                          },
                        },
                        {
                          id: `${Devtools.Echo.Schema}-${node.id}`,
                          data: Devtools.Echo.Schema,
                          type: DEVTOOLS_TYPE,
                          properties: {
                            label: ['schema label', { ns: DEBUG_PLUGIN }],
                            icon: 'ph--database--regular',
                          },
                        },
                        {
                          id: `${Devtools.Echo.Automerge}-${node.id}`,
                          data: Devtools.Echo.Automerge,
                          type: DEVTOOLS_TYPE,
                          properties: {
                            label: ['automerge label', { ns: DEBUG_PLUGIN }],
                            icon: 'ph--gear-six--regular',
                          },
                        },
                        {
                          id: `${Devtools.Echo.Queues}-${node.id}`,
                          data: Devtools.Echo.Queues,
                          type: DEVTOOLS_TYPE,
                          properties: {
                            label: ['queues label', { ns: DEBUG_PLUGIN }],
                            icon: 'ph--queue--regular',
                          },
                        },
                        {
                          id: `${Devtools.Echo.Members}-${node.id}`,
                          data: Devtools.Echo.Members,
                          type: DEVTOOLS_TYPE,
                          properties: {
                            label: ['members label', { ns: DEBUG_PLUGIN }],
                            icon: 'ph--users--regular',
                          },
                        },
                        {
                          id: `${Devtools.Echo.Metadata}-${node.id}`,
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
                      id: `${Devtools.Mesh.id}-${node.id}`,
                      data: null,
                      type: DEVTOOLS_TYPE,
                      properties: {
                        label: ['mesh label', { ns: DEBUG_PLUGIN }],
                        icon: 'ph--graph--regular',
                      },
                      nodes: [
                        {
                          id: `${Devtools.Mesh.Signal}-${node.id}`,
                          data: Devtools.Mesh.Signal,
                          type: DEVTOOLS_TYPE,
                          properties: {
                            label: ['signal label', { ns: DEBUG_PLUGIN }],
                            icon: 'ph--wifi-high--regular',
                          },
                        },
                        {
                          id: `${Devtools.Mesh.Swarm}-${node.id}`,
                          data: Devtools.Mesh.Swarm,
                          type: DEVTOOLS_TYPE,
                          properties: {
                            label: ['swarm label', { ns: DEBUG_PLUGIN }],
                            icon: 'ph--users-three--regular',
                          },
                        },
                        {
                          id: `${Devtools.Mesh.Network}-${node.id}`,
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
                    //   id: `${prefix}-${Devtools.Agent.id}`,
                    //   data: null,
                    //   type: DEVTOOLS_TYPE,
                    //   properties: {
                    //     label: ['agent label', { ns: DEBUG_PLUGIN }],
                    //     icon: 'ph--robot--regular',
                    //   },
                    //   nodes: [
                    //     {
                    //       id: `${prefix}-${Devtools.Agent.Dashboard}`,
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
                      id: `${Devtools.Edge.id}-${node.id}`,
                      data: null,
                      type: DEVTOOLS_TYPE,
                      properties: {
                        label: ['edge label', { ns: DEBUG_PLUGIN }],
                        icon: 'ph--cloud--regular',
                      },
                      nodes: [
                        {
                          id: `${Devtools.Edge.Dashboard}-${node.id}`,
                          data: Devtools.Edge.Dashboard,
                          type: DEVTOOLS_TYPE,
                          properties: {
                            label: ['dashboard label', { ns: DEBUG_PLUGIN }],
                            icon: 'ph--computer-tower--regular',
                          },
                        },
                        {
                          id: `${Devtools.Edge.Workflows}-${node.id}`,
                          data: Devtools.Edge.Workflows,
                          type: DEVTOOLS_TYPE,
                          properties: {
                            label: ['workflows label', { ns: DEBUG_PLUGIN }],
                            icon: 'ph--function--regular',
                          },
                        },
                        {
                          id: `${Devtools.Edge.Traces}-${node.id}`,
                          data: Devtools.Edge.Traces,
                          type: DEVTOOLS_TYPE,
                          properties: {
                            label: ['traces label', { ns: DEBUG_PLUGIN }],
                            icon: 'ph--line-segments--regular',
                          },
                        },
                        {
                          id: `${Devtools.Edge.Testing}-${node.id}`,
                          data: Devtools.Edge.Testing,
                          type: DEVTOOLS_TYPE,
                          properties: {
                            label: ['testing label', { ns: DEBUG_PLUGIN }],
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

    // Debug node.
    createExtension({
      id: 'dxos.org/plugin/debug/debug',
      connector: (node) =>
        Rx.make((get) =>
          pipe(
            get(node),
            Option.flatMap((node) => (node.id === ROOT_ID ? Option.some(node) : Option.none())),
            Option.flatMap(() => {
              const [graph] = get(context.capabilities(Capabilities.AppGraph));
              return graph ? Option.some(graph) : Option.none();
            }),
            Option.flatMap((graph) => {
              // TODO(wittjosiah): Plank is currently blank. Remove?
              // const settings = context
              //   .requestCapabilities(Capabilities.SettingsStore)[0]
              //   ?.getStore<DebugSettingsProps>(DEBUG_PLUGIN)?.value;
              // return !!settings?.debug && node.id === 'root';
              return Option.none();
            }),
            Option.map((graph) => [
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
            ]),
            Option.getOrElse(() => []),
          ),
        ),
    }),

    // Debug object companion.
    createExtension({
      id: `${DEBUG_PLUGIN}/debug-object`,
      connector: (node) =>
        Rx.make((get) =>
          pipe(
            get(node),
            Option.flatMap((node) => (Obj.isObject(node.data) ? Option.some(node) : Option.none())),
            Option.map((node) => [
              {
                id: [node.id, 'debug'].join(ATTENDABLE_PATH_SEPARATOR),
                type: PLANK_COMPANION_TYPE,
                data: 'debug',
                properties: {
                  label: ['debug label', { ns: DEBUG_PLUGIN }],
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
      id: `${DEBUG_PLUGIN}/devtools-overview`,
      connector: (node) =>
        Rx.make((get) =>
          pipe(
            get(node),
            Option.flatMap((node) => (node.id === ROOT_ID ? Option.some(node) : Option.none())),
            Option.map((node) => [
              {
                id: [node.id, 'devtools'].join(ATTENDABLE_PATH_SEPARATOR),
                type: DECK_COMPANION_TYPE,
                data: null,
                properties: {
                  label: ['devtools overview label', { ns: DEBUG_PLUGIN }],
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
  ]);
