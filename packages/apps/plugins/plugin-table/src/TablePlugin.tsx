//
// Copyright 2023 DXOS.org
//

import { Plus } from '@phosphor-icons/react';
import React from 'react';

import { GraphNodeAdapter, SpaceAction } from '@braneframe/plugin-space';
import { Table as TableType } from '@braneframe/types';
import { resolvePlugin, type PluginDefinition, parseIntentPlugin, LayoutAction } from '@dxos/app-framework';
import { Expando, Filter, Schema, SpaceProxy, type TypedObject } from '@dxos/client/echo';

import { TableMain, TableSection } from './components';
import translations from './translations';
import { isTable, TABLE_PLUGIN, TableAction, type TablePluginProvides } from './types';
import { objectToGraphNode } from './util';

// TODO(wittjosiah): This ensures that typed objects are not proxied by deepsignal. Remove.
// https://github.com/luisherranz/deepsignal/issues/36
(globalThis as any)[Expando.name] = Expando;

export const TablePlugin = (): PluginDefinition<TablePluginProvides> => {
  let adapter: GraphNodeAdapter<TypedObject> | undefined;

  return {
    meta: {
      id: TABLE_PLUGIN,
    },
    ready: async (plugins) => {
      const intentPlugin = resolvePlugin(plugins, parseIntentPlugin);
      const dispatch = intentPlugin?.provides?.intent?.dispatch;
      if (dispatch) {
        adapter = new GraphNodeAdapter({
          dispatch,
          filter: Filter.from((object: TypedObject) => isTable(object)),
          adapter: objectToGraphNode,
        });
      }
    },
    unload: async () => {
      adapter?.clear();
    },
    provides: {
      translations,
      graph: {
        builder: ({ parent, plugins }) => {
          if (!(parent.data instanceof SpaceProxy)) {
            return;
          }

          const space = parent.data;
          const intentPlugin = resolvePlugin(plugins, parseIntentPlugin);

          parent.addAction({
            id: `${TABLE_PLUGIN}/create`,
            label: ['create object label', { ns: TABLE_PLUGIN }],
            icon: (props) => <Plus {...props} />,
            invoke: () =>
              intentPlugin?.provides.intent.dispatch([
                {
                  plugin: TABLE_PLUGIN,
                  action: TableAction.CREATE,
                },
                {
                  action: SpaceAction.ADD_OBJECT,
                  data: { spaceKey: parent.data.key.toHex() },
                },
                {
                  action: LayoutAction.ACTIVATE,
                },
              ]),
            properties: {
              testId: 'tablePlugin.createObject',
            },
          });

          return adapter?.createNodes(space, parent);
        },
      },
      surface: {
        component: (data, role) => {
          switch (role) {
            case 'main':
              return isTable(data.active) ? <TableMain table={data.active} /> : null;
            case 'section':
              // TODO(burdon): active vs. object?
              return isTable(data.object) ? <TableSection table={data.object} /> : null;
          }

          return null;
        },
      },
      intent: {
        resolver: (intent) => {
          switch (intent.action) {
            case TableAction.CREATE: {
              const schema = new Schema({
                props: [
                  {
                    id: 'title',
                    type: Schema.PropType.STRING,
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
