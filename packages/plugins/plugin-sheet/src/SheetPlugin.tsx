//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { NavigationAction, parseIntentPlugin, resolvePlugin, type PluginDefinition } from '@dxos/app-framework';
import { invariant } from '@dxos/invariant';
import { parseClientPlugin } from '@dxos/plugin-client';
import { createExtension, isActionGroup, type ActionGroup } from '@dxos/plugin-graph';
import { FunctionType } from '@dxos/plugin-script/types';
import { SpaceAction } from '@dxos/plugin-space';
import { getSpace, isEchoObject } from '@dxos/react-client/echo';
import { Icon } from '@dxos/react-ui';

import { ComputeGraphContextProvider, SheetContainer, SheetObjectSettings } from './components';
import { type ComputeGraphRegistry } from './compute-graph';
import { compareIndexPositions, createSheet } from './defs';
import { computeGraphFacet } from './extensions';
import meta, { SHEET_PLUGIN } from './meta';
import { serializer } from './serializer';
import translations from './translations';
import { SheetAction, SheetType, type SheetPluginProvides } from './types';

export const SheetPlugin = (): PluginDefinition<SheetPluginProvides> => {
  let computeGraphRegistry: ComputeGraphRegistry | undefined;

  return {
    meta,
    ready: async (plugins) => {
      const client = resolvePlugin(plugins, parseClientPlugin)?.provides.client;
      invariant(client);
      let remoteFunctionUrl: string | undefined;
      if (client.config.values.runtime?.services?.edge?.url) {
        const url = new URL('/functions', client.config.values.runtime?.services?.edge?.url);
        url.protocol = 'https';
        remoteFunctionUrl = url.toString();
      }

      // Async import removes direct dependency on hyperformula.
      const { defaultPlugins, ComputeGraphRegistry } = await import('./compute-graph');
      computeGraphRegistry = new ComputeGraphRegistry({ plugins: defaultPlugins, remoteFunctionUrl });
    },
    provides: {
      context: ({ children }) => {
        invariant(computeGraphRegistry);
        return <ComputeGraphContextProvider registry={computeGraphRegistry}>{children}</ComputeGraphContextProvider>;
      },
      metadata: {
        records: {
          [SheetType.typename]: {
            label: (object: any) => (object instanceof SheetType ? object.name : undefined),
            placeholder: ['sheet title placeholder', { ns: SHEET_PLUGIN }],
            icon: 'ph--grid-nine--regular',
            serializer,
          },
        },
      },
      translations,
      echo: {
        // TODO(wittjosiah): Factor out to common package/plugin.
        //  FunctionType is currently registered here in case script plugin isn't enabled.
        schema: [SheetType, FunctionType],
      },
      space: {
        onSpaceCreate: {
          label: ['create sheet label', { ns: SHEET_PLUGIN }],
          action: SheetAction.CREATE,
        },
      },
      graph: {
        builder: (plugins) => {
          const client = resolvePlugin(plugins, parseClientPlugin)?.provides.client;
          const dispatch = resolvePlugin(plugins, parseIntentPlugin)?.provides.intent.dispatch;
          if (!client || !dispatch) {
            return [];
          }

          return createExtension({
            id: SheetAction.CREATE,
            filter: (node): node is ActionGroup => isActionGroup(node) && node.id.startsWith(SpaceAction.ADD_OBJECT),
            actions: ({ node }) => {
              const id = node.id.split('/').at(-1);
              const [spaceId, objectId] = id?.split(':') ?? [];
              const space = client.spaces.get().find((space) => space.id === spaceId);
              const object = objectId && space?.db.getObjectById(objectId);
              const target = objectId ? object : space;
              if (!target) {
                return;
              }

              return [
                {
                  id: `${SHEET_PLUGIN}/create/${node.id}`,
                  data: async () => {
                    await dispatch([
                      { plugin: SHEET_PLUGIN, action: SheetAction.CREATE, data: { space } },
                      { action: SpaceAction.ADD_OBJECT, data: { target } },
                      { action: NavigationAction.OPEN },
                    ]);
                  },
                  properties: {
                    label: ['create sheet label', { ns: SHEET_PLUGIN }],
                    icon: 'ph--grid-nine--regular',
                    testId: 'sheetPlugin.createObject',
                  },
                },
              ];
            },
          });
        },
      },
      markdown: {
        extensions: ({ document: doc }) => {
          invariant(computeGraphRegistry);
          const space = getSpace(doc);
          if (space) {
            const computeGraph = computeGraphRegistry.getOrCreateGraph(space);
            return computeGraphFacet.of(computeGraph);
          }
        },
      },
      stack: {
        creators: [
          {
            id: 'create-stack-section-sheet',
            testId: 'sheetPlugin.createSection',
            type: ['plugin name', { ns: SHEET_PLUGIN }],
            label: ['create sheet section label', { ns: SHEET_PLUGIN }],
            // TODO(thure): Refactor to use strings
            icon: (props: any) => <Icon icon='ph--grid-nine--regular' {...props} />,
            intent: {
              plugin: SHEET_PLUGIN,
              action: SheetAction.CREATE,
            },
          },
        ],
      },
      thread: {
        predicate: (data) => data instanceof SheetType,
        createSort: (sheet) => (indexA, indexB) =>
          !indexA || !indexB ? 0 : compareIndexPositions(sheet, indexA, indexB),
      },
      surface: {
        component: ({ data, role }) => {
          const space = isEchoObject(data.object) ? getSpace(data.object) : undefined;
          switch (role) {
            case 'article':
            case 'section':
              if (space && data.object instanceof SheetType) {
                return <SheetContainer space={space} sheet={data.object} role={role} />;
              }
              break;
            case 'complementary--settings':
              if (data.subject instanceof SheetType) {
                return <SheetObjectSettings sheet={data.subject} />;
              }
              break;
          }

          return null;
        },
      },
      intent: {
        resolver: async (intent) => {
          switch (intent.action) {
            case SheetAction.CREATE: {
              return { data: createSheet() };
            }
            case SheetAction.INSERT_AXIS: {
              const { model, axis, index, count } = intent.data as SheetAction.InsertAxis;
              const _indices = model[axis === 'col' ? 'insertColumns' : 'insertRows'](index, count);
              return;
            }
            case SheetAction.DROP_AXIS: {
              if (!intent.undo) {
                const { model, axis, axisIndex } = intent.data as SheetAction.DropAxis;
                const undoData = model[axis === 'col' ? 'dropColumn' : 'dropRow'](axisIndex);
                return {
                  undoable: {
                    message: translations[0]['en-US'][SHEET_PLUGIN][`${axis} dropped label`],
                    data: { ...undoData, model },
                  },
                };
              } else {
                const { model, ...undoData } = intent.data as SheetAction.DropAxisRestore;
                model[undoData.axis === 'col' ? 'restoreColumn' : 'restoreRow'](undoData);
              }
            }
          }
        },
      },
    },
  };
};
