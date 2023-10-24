//
// Copyright 2023 DXOS.org
//

import { Plus } from '@phosphor-icons/react';
import React from 'react';

import { GraphNodeAdapter, SpaceAction } from '@braneframe/plugin-space';
import { resolvePlugin, type PluginDefinition, parseIntentPlugin, LayoutAction } from '@dxos/app-framework';
import { SpaceProxy, Expando, type TypedObject } from '@dxos/client/echo';

import { TemplateMain } from './components';
import translations from './translations';
import { isObject, TEMPLATE_PLUGIN, TemplateAction, type TemplatePluginProvides } from './types';
import { objectToGraphNode } from './util';

// TODO(wittjosiah): This ensures that typed objects are not proxied by deepsignal. Remove.
// https://github.com/luisherranz/deepsignal/issues/36
(globalThis as any)[Expando.name] = Expando;

export const TemplatePlugin = (): PluginDefinition<TemplatePluginProvides> => {
  let adapter: GraphNodeAdapter<TypedObject> | undefined;
  return {
    meta: {
      id: TEMPLATE_PLUGIN,
    },
    ready: async (plugins) => {
      const intentPlugin = resolvePlugin(plugins, parseIntentPlugin);
      const dispatch = intentPlugin?.provides?.intent?.dispatch;
      if (dispatch) {
        adapter = new GraphNodeAdapter({
          dispatch,
          filter: (object: TypedObject) => isObject(object),
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
            id: `${TEMPLATE_PLUGIN}/create`, // TODO(burdon): Uniformly "create".
            label: ['create object label', { ns: TEMPLATE_PLUGIN }], // TODO(burdon): "object"
            icon: (props) => <Plus {...props} />,
            // TODO(burdon): Factor out helper.
            invoke: () =>
              intentPlugin?.provides.intent.dispatch([
                {
                  plugin: TEMPLATE_PLUGIN,
                  action: TemplateAction.CREATE,
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
              testId: 'templatePlugin.createObject',
            },
          });

          return adapter?.createNodes(space, parent);
        },
      },
      surface: {
        component: (data, role) => {
          switch (role) {
            case 'main': {
              return isObject(data.active) ? <TemplateMain object={data.active} /> : null;
            }
          }

          return null;
        },
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
