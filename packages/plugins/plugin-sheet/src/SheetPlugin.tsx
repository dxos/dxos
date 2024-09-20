//
// Copyright 2023 DXOS.org
//

import { type IconProps, GridNine } from '@phosphor-icons/react';
import React from 'react';

import {
  NavigationAction,
  parseIntentPlugin,
  resolvePlugin,
  type PluginDefinition,
  type LayoutCoordinate,
} from '@dxos/app-framework';
import { create } from '@dxos/echo-schema';
import { parseClientPlugin } from '@dxos/plugin-client';
import { type ActionGroup, createExtension, isActionGroup } from '@dxos/plugin-graph';
import { FunctionType } from '@dxos/plugin-script/types';
import { SpaceAction } from '@dxos/plugin-space';
import { getSpace, isEchoObject } from '@dxos/react-client/echo';

import { createComputeGraph, SheetContainer, type ComputeGraph } from './components';
// TODO(wittjosiah): Refactor. These are not exported from ./components due to depending on ECHO.
import { EdgeFunctionPlugin, EdgeFunctionPluginTranslations } from './components/ComputeGraph/edge-function';
import { ComputeGraphContextProvider } from './components/ComputeGraph/graph-context';
import meta, { SHEET_PLUGIN } from './meta';
import { SheetModel } from './model';
import translations from './translations';
import { createSheet, SheetAction, type SheetPluginProvides, SheetType } from './types';

export const SheetPlugin = (): PluginDefinition<SheetPluginProvides> => {
  let remoteFunctionUrl: string | undefined;

  const graphs = create<Record<string, ComputeGraph>>({});
  const setGraph = (key: string, graph: ComputeGraph) => {
    graphs[key] = graph;
  };

  return {
    meta,
    ready: async (plugins) => {
      const client = resolvePlugin(plugins, parseClientPlugin)?.provides.client;
      if (!client) {
        return;
      }

      if (client.config.values.runtime?.services?.edge?.url) {
        const url = new URL('/functions', client.config.values.runtime?.services?.edge?.url);
        url.protocol = 'https';
        remoteFunctionUrl = url.toString();
      }
    },
    provides: {
      context: ({ children }) => {
        return (
          <ComputeGraphContextProvider graphs={graphs} setGraph={setGraph}>
            {children}
          </ComputeGraphContextProvider>
        );
      },
      metadata: {
        records: {
          [SheetType.typename]: {
            placeholder: ['sheet title placeholder', { ns: SHEET_PLUGIN }],
            icon: (props: IconProps) => <GridNine {...props} />,
            iconSymbol: 'ph--grid-nine--regular',
          },
        },
      },
      translations,
      echo: {
        // TODO(wittjosiah): Factor out to common package/plugin.
        //   FunctionType is currently registered here in case script plugin isn't enabled.
        schema: [SheetType, FunctionType],
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
                    icon: (props: IconProps) => <GridNine {...props} />,
                    iconSymbol: 'ph--grid-nine--regular',
                    testId: 'sheetPlugin.createObject',
                  },
                },
              ];
            },
          });
        },
      },
      stack: {
        creators: [
          {
            id: 'create-stack-section-sheet',
            testId: 'sheetPlugin.createSectionSpaceSheet',
            type: ['plugin name', { ns: SHEET_PLUGIN }],
            label: ['create sheet section label', { ns: SHEET_PLUGIN }],
            icon: (props: any) => <GridNine {...props} />,
            intent: { plugin: SHEET_PLUGIN, action: SheetAction.CREATE },
          },
        ],
      },
      surface: {
        component: ({ data, role = 'never' }) => {
          // TODO(burdon): Standardize wrapper (with room for toolbar).
          const space = isEchoObject(data.object) && getSpace(data.object);
          if (space && data.object instanceof SheetType) {
            switch (role) {
              case 'article':
              case 'section': {
                return (
                  <SheetContainer
                    sheet={data.object}
                    space={space}
                    role={role}
                    coordinate={data.coordinate as LayoutCoordinate}
                    remoteFunctionUrl={remoteFunctionUrl}
                  />
                );
              }
            }
          }

          return null;
        },
      },
      intent: {
        resolver: async (intent) => {
          switch (intent.action) {
            case SheetAction.CREATE: {
              const space = intent.data?.space;
              const sheet = createSheet();
              const graph =
                graphs[space.id] ??
                createComputeGraph(
                  [{ plugin: EdgeFunctionPlugin, translations: EdgeFunctionPluginTranslations }],
                  space,
                  { remoteFunctionUrl },
                );
              const model = new SheetModel(graph, sheet);
              await model.initialize();
              await model.destroy();
              return { data: sheet };
            }
          }
        },
      },
    },
  };
};
