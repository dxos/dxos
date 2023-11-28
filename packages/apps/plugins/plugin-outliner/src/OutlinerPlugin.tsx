//
// Copyright 2023 DXOS.org
//

import { Check, TreeStructure, type IconProps } from '@phosphor-icons/react';
import React from 'react';

import { SPACE_PLUGIN, SpaceAction } from '@braneframe/plugin-space';
import { Tree as TreeType, Folder } from '@braneframe/types';
import { resolvePlugin, parseIntentPlugin, LayoutAction, type PluginDefinition } from '@dxos/app-framework';
import { SpaceProxy } from '@dxos/react-client/echo';

import { OutlinerMain, TreeSection } from './components';
import meta, { OUTLINER_PLUGIN } from './meta';
import translations from './translations';
import { OutlinerAction, type OutlinerPluginProvides, isObject } from './types';

// TODO(wittjosiah): This ensures that typed objects are not proxied by deepsignal. Remove.
// https://github.com/luisherranz/deepsignal/issues/36
(globalThis as any)[TreeType.name] = TreeType;

export const OutlinerPlugin = (): PluginDefinition<OutlinerPluginProvides> => {
  return {
    meta,
    provides: {
      metadata: {
        records: {
          [TreeType.schema.typename]: {
            placeholder: ['object placeholder', { ns: OUTLINER_PLUGIN }],
            icon: (props: IconProps) => <TreeStructure {...props} />,
          },
        },
      },
      translations,
      graph: {
        builder: ({ parent, plugins }) => {
          const intentPlugin = resolvePlugin(plugins, parseIntentPlugin);

          if (parent.data instanceof Folder || parent.data instanceof SpaceProxy) {
            parent.actionsMap[`${SPACE_PLUGIN}/create`]?.addAction({
              id: `${OUTLINER_PLUGIN}/create`,
              label: ['create object label', { ns: OUTLINER_PLUGIN }],
              icon: (props) => <TreeStructure {...props} />,
              invoke: () =>
                intentPlugin?.provides.intent.dispatch([
                  {
                    plugin: OUTLINER_PLUGIN,
                    action: OutlinerAction.CREATE,
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
                testId: 'treePlugin.createObject',
              },
            });
          } else if (isObject(parent.data)) {
            parent.addAction({
              id: `${OUTLINER_PLUGIN}/toggle-checkbox`,
              label: ['toggle checkbox label', { ns: OUTLINER_PLUGIN }],
              icon: (props) => <Check {...props} />,
              invoke: () =>
                intentPlugin?.provides.intent.dispatch({
                  plugin: OUTLINER_PLUGIN,
                  action: OutlinerAction.TOGGLE_CHECKBOX,
                  data: { object: parent.data },
                }),
            });
          }
        },
      },
      stack: {
        creators: [
          {
            id: 'create-stack-section-tree',
            testId: 'treePlugin.createSectionSpaceTree',
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
              return isObject(data.active) ? <OutlinerMain tree={data.active as TreeType} /> : null;
            case 'section':
              return isObject(data.object) ? <TreeSection tree={data.object as TreeType} /> : null;
          }

          return null;
        },
      },
      intent: {
        resolver: (intent) => {
          switch (intent.action) {
            case OutlinerAction.CREATE: {
              return {
                object: new TreeType({
                  root: new TreeType.Item({
                    items: [new TreeType.Item()],
                  }),
                }),
              };
            }

            case OutlinerAction.TOGGLE_CHECKBOX: {
              (intent.data.object as TreeType).checkbox = !(intent.data.object as TreeType).checkbox;
              break;
            }
          }
        },
      },
    },
  };
};
