//
// Copyright 2023 DXOS.org
//

import { Plus } from '@phosphor-icons/react';
import React from 'react';

import { GraphNodeAdapter, SpaceAction } from '@braneframe/plugin-space';
import { SplitViewAction } from '@braneframe/plugin-splitview';
import { SpaceProxy, Expando, type TypedObject } from '@dxos/client/echo';
import { type PluginDefinition } from '@dxos/react-surface';

import { TemplateMain } from './components';
import translations from './translations';
import { isObject, TEMPLATE_PLUGIN, TemplateAction, type TemplatePluginProvides } from './types';
import { objectToGraphNode } from './util';

// TODO(wittjosiah): This ensures that typed objects are not proxied by deepsignal. Remove.
// https://github.com/luisherranz/deepsignal/issues/36
(globalThis as any)[Expando.name] = Expando;

export const TemplatePlugin = (): PluginDefinition<TemplatePluginProvides> => {
  const adapter = new GraphNodeAdapter({
    filter: (object: TypedObject) => isObject(object),
    adapter: objectToGraphNode,
  });

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
        nodes: (parent) => {
          if (!(parent.data instanceof SpaceProxy)) {
            return;
          }

          const space = parent.data;

          parent.addAction({
            id: `${TEMPLATE_PLUGIN}/create`, // TODO(burdon): Uniformly "create".
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
                action: SplitViewAction.ACTIVATE,
              },
            ],
            properties: {
              testId: 'templatePlugin.createKanban', // TODO(burdon): Namespace?
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
            return isObject(data) ? TemplateMain : null;
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
