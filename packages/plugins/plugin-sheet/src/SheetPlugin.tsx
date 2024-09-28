//
// Copyright 2023 DXOS.org
//

import { GridNine, type IconProps } from '@phosphor-icons/react';
import React from 'react';

import { NavigationAction, parseIntentPlugin, resolvePlugin, type PluginDefinition } from '@dxos/app-framework';
import { invariant } from '@dxos/invariant';
import { parseClientPlugin } from '@dxos/plugin-client';
import { createExtension, isActionGroup, type ActionGroup } from '@dxos/plugin-graph';
import { FunctionType } from '@dxos/plugin-script/types';
import { SpaceAction } from '@dxos/plugin-space';
import { getSpace, isEchoObject } from '@dxos/react-client/echo';

import { SheetContainer, ComputeGraphContextProvider } from './components';
import { type ComputeGraphRegistry } from './graph';
import { createGraphRegistry } from './graph/factory'; // TODO(burdon): Async.
import meta, { SHEET_PLUGIN } from './meta';
import { compareIndexPositions } from './model';
import translations from './translations';
import { SheetAction, SheetType, type SheetPluginProvides, createSheet } from './types';

export const SheetPlugin = (): PluginDefinition<SheetPluginProvides> => {
  let remoteFunctionUrl: string | undefined;

  // TODO(burdon): Move into separate plugin.
  let graphRegistry: ComputeGraphRegistry | undefined;

  return {
    meta,
    ready: async (plugins) => {
      const client = resolvePlugin(plugins, parseClientPlugin)?.provides.client;
      invariant(client);
      if (client.config.values.runtime?.services?.edge?.url) {
        const url = new URL('/functions', client.config.values.runtime?.services?.edge?.url);
        url.protocol = 'https';
        remoteFunctionUrl = url.toString();
      }

      graphRegistry = await createGraphRegistry({ remoteFunctionUrl });
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
            icon: (props: IconProps) => <GridNine {...props} />,
            iconSymbol: 'ph--grid-nine--regular',
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
        component: ({ data, role = 'never' }) => {
          // TODO(burdon): Standardize wrapper (with room for toolbar).
          const space = isEchoObject(data.object) && getSpace(data.object);
          if (space && data.object instanceof SheetType) {
            switch (role) {
              case 'article':
              case 'section': {
                return <SheetContainer sheet={data.object} space={space} role={role} />;
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
              invariant(graphRegistry);
              const space = intent.data?.space;
              invariant(space);
              let graph = graphRegistry.getGraph(space.id);
              if (!graph) {
                graph = await graphRegistry.createGraph(space);
              }

              const sheet = createSheet();
              return { data: sheet };
            }
          }
        },
      },
    },
  };
};
