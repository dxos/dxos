//
// Copyright 2023 DXOS.org
//

import { TreeStructure, type IconProps } from '@phosphor-icons/react';
import React from 'react';

import { resolvePlugin, parseIntentPlugin, type PluginDefinition, NavigationAction } from '@dxos/app-framework';
import { create } from '@dxos/echo-schema';
import { parseClientPlugin } from '@dxos/plugin-client';
import { type ActionGroup, createExtension, isActionGroup } from '@dxos/plugin-graph';
import { SpaceAction } from '@dxos/plugin-space';
import { loadObjectReferences } from '@dxos/react-client/echo';

import { OutlinerMain, TreeSection } from './components';
import meta, { OUTLINER_PLUGIN } from './meta';
import translations from './translations';
import { TreeItemType, TreeType } from './types';
import { OutlinerAction, type OutlinerPluginProvides } from './types';

export const OutlinerPlugin = (): PluginDefinition<OutlinerPluginProvides> => {
  return {
    meta,
    provides: {
      metadata: {
        records: {
          [TreeType.typename]: {
            placeholder: ['object placeholder', { ns: OUTLINER_PLUGIN }],
            icon: (props: IconProps) => <TreeStructure {...props} />,
            iconSymbol: 'ph--tree-structure--regular',
            // TODO(wittjosiah): Move out of metadata.
            loadReferences: (tree: TreeType) => loadObjectReferences(tree, (tree) => [tree.root]),
          },
          [TreeItemType.typename]: {
            // TODO(wittjosiah): Move out of metadata.
            loadReferences: (item: TreeItemType) => loadObjectReferences(item, (item) => item.items),
          },
        },
      },
      echo: {
        schema: [TreeItemType, TreeType],
      },
      translations,
      graph: {
        builder: (plugins) => {
          const client = resolvePlugin(plugins, parseClientPlugin)?.provides.client;
          const dispatch = resolvePlugin(plugins, parseIntentPlugin)?.provides.intent.dispatch;
          if (!client || !dispatch) {
            return [];
          }

          return createExtension({
            id: OutlinerAction.CREATE,
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
                  id: `${OUTLINER_PLUGIN}/create/${node.id}`,
                  data: async () => {
                    await dispatch([
                      { plugin: OUTLINER_PLUGIN, action: OutlinerAction.CREATE },
                      { action: SpaceAction.ADD_OBJECT, data: { target } },
                      { action: NavigationAction.OPEN },
                    ]);
                  },
                  properties: {
                    label: ['create object label', { ns: OUTLINER_PLUGIN }],
                    icon: (props: IconProps) => <TreeStructure {...props} />,
                    iconSymbol: 'ph--tree-structure--regular',
                    testId: 'outlinerPlugin.createObject',
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
            id: 'create-stack-section-tree',
            testId: 'treePlugin.createSectionSpaceTree',
            type: ['plugin name', { ns: OUTLINER_PLUGIN }],
            label: ['create stack section label', { ns: OUTLINER_PLUGIN }],
            icon: (props: any) => <TreeStructure {...props} />,
            intent: {
              plugin: OUTLINER_PLUGIN,
              action: OutlinerAction.CREATE,
            },
          },
        ],
      },
      surface: {
        component: ({ data, role }) => {
          switch (role) {
            case 'main':
              return data.active instanceof TreeType ? <OutlinerMain tree={data.active} /> : null;
            case 'section':
              return data.object instanceof TreeType ? <TreeSection tree={data.object} /> : null;
          }

          return null;
        },
      },
      intent: {
        resolver: (intent) => {
          switch (intent.action) {
            case OutlinerAction.CREATE: {
              return {
                data: create(TreeType, {
                  root: create(TreeItemType, {
                    content: '',
                    items: [create(TreeItemType, { content: '', items: [] })],
                  }),
                }),
              };
            }

            case OutlinerAction.TOGGLE_CHECKBOX: {
              if (intent.data?.object instanceof TreeType) {
                intent.data.object.checkbox = !intent.data.object.checkbox;
                return { data: true };
              }
              break;
            }
          }
        },
      },
    },
  };
};
