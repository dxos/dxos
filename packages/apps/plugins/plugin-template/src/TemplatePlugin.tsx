//
// Copyright 2023 DXOS.org
//

import { Asterisk, type IconProps } from '@phosphor-icons/react';
import React from 'react';

import { SpaceAction } from '@braneframe/plugin-space';
import { Folder } from '@braneframe/types';
import { resolvePlugin, parseIntentPlugin, LayoutAction, type PluginDefinition } from '@dxos/app-framework';
import { Expando } from '@dxos/react-client/echo';

import { TemplateMain } from './components';
import translations from './translations';
import { TEMPLATE_PLUGIN, TemplateAction, type TemplatePluginProvides, isObject } from './types';

// TODO(wittjosiah): This ensures that typed objects are not proxied by deepsignal. Remove.
// https://github.com/luisherranz/deepsignal/issues/36
(globalThis as any)[Expando.name] = Expando;

export const TemplatePlugin = (): PluginDefinition<TemplatePluginProvides> => {
  return {
    meta: {
      id: TEMPLATE_PLUGIN,
    },
    provides: {
      metadata: {
        records: {
          // [Type.schema.typename]
          template: {
            fallbackName: ['object placeholder', { ns: TEMPLATE_PLUGIN }],
            icon: (props: IconProps) => <Asterisk {...props} />,
          },
        },
      },
      translations,
      graph: {
        builder: ({ parent, plugins }) => {
          if (!(parent.data instanceof Folder)) {
            return;
          }

          const intentPlugin = resolvePlugin(plugins, parseIntentPlugin);

          parent.actionsMap['create-object-group']?.addAction({
            id: `${TEMPLATE_PLUGIN}/create`, // TODO(burdon): Uniformly "create".
            label: ['create object label', { ns: TEMPLATE_PLUGIN }], // TODO(burdon): "object"
            icon: (props) => <Asterisk {...props} />,
            // TODO(burdon): Factor out helper.
            invoke: () =>
              intentPlugin?.provides.intent.dispatch([
                {
                  plugin: TEMPLATE_PLUGIN,
                  action: TemplateAction.CREATE,
                },
                {
                  action: SpaceAction.ADD_TO_FOLDER,
                  data: { folder: parent.data },
                },
                {
                  action: LayoutAction.ACTIVATE,
                },
              ]),
            properties: {
              testId: 'templatePlugin.createObject',
            },
          });
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
