//
// Copyright 2023 DXOS.org
//

import { GridNine } from '@phosphor-icons/react';
import React from 'react';

import { NavigationAction, parseIntentPlugin, resolvePlugin, type PluginDefinition } from '@dxos/app-framework';
import { invariant } from '@dxos/invariant';
import { parseClientPlugin } from '@dxos/plugin-client';
import { createExtension, isActionGroup, type ActionGroup } from '@dxos/plugin-graph';
import { FunctionType } from '@dxos/plugin-script/types';
import { SpaceAction } from '@dxos/plugin-space';
import { getSpace, isEchoObject } from '@dxos/react-client/echo';

import { ComputeGraphContextProvider, SheetContainer } from './components';
import { compareIndexPositions, createSheet } from './defs';
import { type ComputeGraphRegistry } from './graph';
import { useComputeGraph } from './hooks';
import meta, { SHEET_PLUGIN } from './meta';
import translations from './translations';
import { SheetAction, SheetType, type SheetPluginProvides } from './types';

export const SheetPlugin = (): PluginDefinition<SheetPluginProvides> => {
  let graphRegistry: ComputeGraphRegistry | undefined;

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
      const { createComputeGraphRegistry } = await import('./graph');
      graphRegistry = createComputeGraphRegistry({ remoteFunctionUrl });
    },
    provides: {
      context: ({ children }) => {
        invariant(graphRegistry);
        return <ComputeGraphContextProvider registry={graphRegistry}>{children}</ComputeGraphContextProvider>;
      },
      metadata: {
        records: {
          [SheetType.typename]: {
            label: (object: any) => (object instanceof SheetType ? object.title : undefined),
            placeholder: ['sheet title placeholder', { ns: SHEET_PLUGIN }],
            icon: 'ph--grid-nine--regular',
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
        // TODO(burdon): Construct compute node.
        extensions: ({ document }) => {
          return undefined;
          // return [
          // compute(document)
          // ];
        },
      },
      stack: {
        creators: [
          {
            id: 'create-stack-section-sheet',
            testId: 'sheetPlugin.createSection',
            type: ['plugin name', { ns: SHEET_PLUGIN }],
            label: ['create sheet section label', { ns: SHEET_PLUGIN }],
            icon: (props: any) => <GridNine {...props} />,
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
          const graph = useComputeGraph(space);
          if (graph && data.object instanceof SheetType) {
            switch (role) {
              case 'article':
              case 'section': {
                return <SheetContainer graph={graph} sheet={data.object} role={role} />;
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
              return { data: createSheet() };
            }
          }
        },
      },
    },
  };
};
