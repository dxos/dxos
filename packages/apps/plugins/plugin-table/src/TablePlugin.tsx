//
// Copyright 2023 DXOS.org
//

import { Plus } from '@phosphor-icons/react';
import React from 'react';

import { GraphNodeAdapter, SpaceAction } from '@braneframe/plugin-space';
import { TreeViewAction } from '@braneframe/plugin-treeview';
import { Schema as SchemaType, Table as TableType } from '@braneframe/types';
import { SpaceProxy, Expando, TypedObject } from '@dxos/client/echo';
import { PluginDefinition } from '@dxos/react-surface';

import { TableMain } from './components';
import translations from './translations';
import { isObject, TABLE_PLUGIN, TableAction, TablePluginProvides } from './types';
import { objectToGraphNode } from './util';

// TODO(wittjosiah): This ensures that typed objects are not proxied by deepsignal. Remove.
// https://github.com/luisherranz/deepsignal/issues/36
(globalThis as any)[Expando.name] = Expando;

export const TablePlugin = (): PluginDefinition<TablePluginProvides> => {
  const adapter = new GraphNodeAdapter({
    filter: (object: TypedObject) => isObject(object),
    adapter: objectToGraphNode,
  });

  return {
    meta: {
      id: TABLE_PLUGIN,
    },
    unload: async () => {
      adapter.clear();
    },
    provides: {
      translations,
      graph: {
        nodes: (parent) => {
          if (!(parent.data instanceof SpaceProxy)) {
            return;
          }

          const space = parent.data;

          parent.addAction({
            id: `${TABLE_PLUGIN}/create`,
            label: ['create object label', { ns: TABLE_PLUGIN }],
            icon: (props) => <Plus {...props} />,
            intent: [
              {
                plugin: TABLE_PLUGIN,
                action: TableAction.CREATE,
              },
              {
                action: SpaceAction.ADD_OBJECT,
                data: { spaceKey: parent.data.key.toHex() },
              },
              {
                action: TreeViewAction.ACTIVATE,
              },
            ],
            properties: {
              testId: 'tablePlugin.createKanban',
            },
          });

          return adapter.createNodes(space, parent);
        },
      },
      component: (data, role) => {
        if (!data || typeof data !== 'object') {
          return null;
        }

        switch (role) {
          case 'main': {
            return isObject(data) ? TableMain : null;
          }
        }

        return null;
      },
      intent: {
        resolver: (intent) => {
          switch (intent.action) {
            case TableAction.CREATE: {
              const schema = new SchemaType({
                props: [
                  {
                    id: 'title',
                    type: SchemaType.PropType.STRING,
                  },
                ],
              });

              return { object: new TableType({ schema }) };
            }
          }
        },
      },
    },
  };
};
