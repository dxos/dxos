//
// Copyright 2023 DXOS.org
//

import { Plus } from '@phosphor-icons/react';
import React from 'react';

import { getIndices, GraphNodeAdapter, SpaceAction } from '@braneframe/plugin-space';
import { TreeViewAction } from '@braneframe/plugin-treeview';
import { SpaceProxy, Expando, TypedObject } from '@dxos/client/echo';
import { PluginDefinition } from '@dxos/react-surface';

import { TemplateMain } from './components';
import translations from './translations';
import { isObject, TEMPLATE_PLUGIN, TemplateAction, TemplatePluginProvides } from './types';
import { objectToGraphNode } from './util';

// TODO(wittjosiah): This ensures that typed objects are not proxied by deepsignal. Remove.
// https://github.com/luisherranz/deepsignal/issues/36
(globalThis as any)[Expando.name] = Expando;

export const TemplatePlugin = (): PluginDefinition<TemplatePluginProvides> => {
  const adapter = new GraphNodeAdapter((object: TypedObject) => isObject(object), objectToGraphNode);

  return {
    meta: {
      id: TEMPLATE_PLUGIN,
    },
    unload: async () => {
      adapter.clear();
    },
    provides: {
      translations,
      graph: {
        nodes: (parent, emit) => {
          if (!(parent.data instanceof SpaceProxy)) {
            return [];
          }

          const space = parent.data;
          return adapter.createNodes(space, parent, emit);
        },
        actions: (parent) => {
          if (!(parent.data instanceof SpaceProxy)) {
            return [];
          }

          return [
            {
              id: `${TEMPLATE_PLUGIN}/create-object`, // TODO(burdon): Uniformly "create-object".
              index: getIndices(1)[0],
              testId: 'templatePlugin.createKanban', // TODO(burdon): Namespace?
              label: ['create object label', { ns: TEMPLATE_PLUGIN }], // TODO(burdon): "object"
              icon: (props) => <Plus {...props} />,
              // TODO(burdon): Factor out helper.
              intent: [
                {
                  plugin: TEMPLATE_PLUGIN,
                  action: TemplateAction.CREATE,
                },
                {
                  action: SpaceAction.ADD_OBJECT,
                  data: { spaceKey: parent.data.key.toHex() },
                },
                {
                  action: TreeViewAction.ACTIVATE,
                },
              ],
            },
          ];
        },
      },
      component: (datum, role) => {
        if (!datum || typeof datum !== 'object') {
          return null;
        }

        switch (role) {
          case 'main': {
            if ('object' in datum && isObject(datum.object)) {
              return TemplateMain;
            }
          }
        }

        return null;
      },
      intent: {
        resolver: (intent) => {
          switch (intent.action) {
            case TemplateAction.CREATE: {
              // TODO(burdon): Set typename.
              return { object: new Expando({ type: 'template' }) };
            }
          }
        },
      },
    },
  };
};
