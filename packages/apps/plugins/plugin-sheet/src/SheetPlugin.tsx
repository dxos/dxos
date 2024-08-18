//
// Copyright 2023 DXOS.org
//

import { type IconProps, GridNine } from '@phosphor-icons/react';
import React from 'react';

import { parseClientPlugin } from '@braneframe/plugin-client';
import { type ActionGroup, createExtension, isActionGroup } from '@braneframe/plugin-graph';
import { SpaceAction } from '@braneframe/plugin-space';
import { NavigationAction, parseIntentPlugin, resolvePlugin, type PluginDefinition } from '@dxos/app-framework';

import { SheetArticle, SheetMain, SheetSection } from './components';
import meta, { SHEET_PLUGIN } from './meta';
import translations from './translations';
import { createSheet, SheetAction, type SheetPluginProvides, SheetType } from './types';

export const SheetPlugin = (): PluginDefinition<SheetPluginProvides> => {
  return {
    meta,
    provides: {
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
        schema: [SheetType],
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
                      { plugin: SHEET_PLUGIN, action: SheetAction.CREATE },
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
            label: ['create sheet section label', { ns: SHEET_PLUGIN }],
            icon: (props: any) => <GridNine {...props} />,
            intent: [
              {
                plugin: SHEET_PLUGIN,
                action: SheetAction.CREATE,
              },
            ],
          },
        ],
      },
      surface: {
        component: ({ data, role }) => {
          switch (role) {
            case 'main':
              return data.active instanceof SheetType ? <SheetMain sheet={data.active} /> : null;
            case 'article':
              return data.object instanceof SheetType ? <SheetArticle sheet={data.object} /> : null;
            case 'section':
              return data.object instanceof SheetType ? <SheetSection sheet={data.object} /> : null;
          }

          return null;
        },
      },
      intent: {
        resolver: (intent) => {
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
