//
// Copyright 2023 DXOS.org
//

import { AnchorSimple, type IconProps } from '@phosphor-icons/react';
import React from 'react';

import { SPACE_PLUGIN, SpaceAction } from '@braneframe/plugin-space';
import { Folder } from '@braneframe/types';
import { resolvePlugin, parseIntentPlugin, LayoutAction, type PluginDefinition } from '@dxos/app-framework';
import { Expando, SpaceProxy } from '@dxos/react-client/echo';

import { MermaidMain, MermaidSection } from './components';
import meta, { MERMAID_PLUGIN } from './meta';
import translations from './translations';
import { MermaidAction, type MermaidPluginProvides, isObject } from './types';

// TODO(wittjosiah): This ensures that typed objects are not proxied by deepsignal. Remove.
// https://github.com/luisherranz/deepsignal/issues/36
(globalThis as any)[Expando.name] = Expando;

const typename = 'mermaid'; // Type.schema.typename

export const MermaidPlugin = (): PluginDefinition<MermaidPluginProvides> => {
  return {
    meta,
    provides: {
      metadata: {
        records: {
          [typename]: {
            placeholder: ['object placeholder', { ns: MERMAID_PLUGIN }],
            icon: (props: IconProps) => <AnchorSimple {...props} />,
          },
        },
      },
      translations,
      graph: {
        builder: ({ parent, plugins }) => {
          if (!(parent.data instanceof Folder || parent.data instanceof SpaceProxy)) {
            return;
          }

          const intentPlugin = resolvePlugin(plugins, parseIntentPlugin);

          parent.actionsMap[`${SPACE_PLUGIN}/create`]?.addAction({
            id: `${MERMAID_PLUGIN}/create`, // TODO(burdon): Uniformly "create".
            label: ['create object label', { ns: MERMAID_PLUGIN }], // TODO(burdon): "object"
            icon: (props) => <AnchorSimple {...props} />,
            // TODO(burdon): Factor out helper.
            invoke: () =>
              intentPlugin?.provides.intent.dispatch([
                {
                  plugin: MERMAID_PLUGIN,
                  action: MermaidAction.CREATE,
                },
                {
                  action: SpaceAction.ADD_OBJECT,
                  data: { target: parent.data },
                },
                {
                  action: LayoutAction.ACTIVATE,
                },
              ]),
            properties: {
              testId: 'mermaidPlugin.createObject',
            },
          });
        },
      },
      surface: {
        component: ({ data, role }) => {
          switch (role) {
            case 'main':
              return isObject(data.active) ? <MermaidMain object={data.active} /> : null;
            case 'section':
              return isObject(data.object) ? <MermaidSection object={data.object} /> : null;
          }

          return null;
        },
      },
      intent: {
        resolver: (intent) => {
          switch (intent.action) {
            case MermaidAction.CREATE: {
              // TODO(burdon): Set typename.
              return { object: new Expando({ type: 'mermaid' }) };
            }
          }
        },
      },
    },
  };
};
