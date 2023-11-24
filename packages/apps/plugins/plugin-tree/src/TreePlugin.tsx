//
// Copyright 2023 DXOS.org
//

import { Check, TreeStructure, type IconProps } from '@phosphor-icons/react';
import React from 'react';

import { SPACE_PLUGIN, SpaceAction } from '@braneframe/plugin-space';
import { Tree as TreeType, Folder } from '@braneframe/types';
import { resolvePlugin, parseIntentPlugin, LayoutAction, type PluginDefinition } from '@dxos/app-framework';
import { SpaceProxy } from '@dxos/react-client/echo';

import { TreeMain, TreeSection } from './components';
import meta, { TREE_PLUGIN } from './meta';
import translations from './translations';
import { TreeAction, type TreePluginProvides, isObject } from './types';

// TODO(wittjosiah): This ensures that typed objects are not proxied by deepsignal. Remove.
// https://github.com/luisherranz/deepsignal/issues/36
(globalThis as any)[TreeType.name] = TreeType;

export const TreePlugin = (): PluginDefinition<TreePluginProvides> => {
  return {
    meta,
    provides: {
      metadata: {
        records: {
          [TreeType.schema.typename]: {
            placeholder: ['object placeholder', { ns: TREE_PLUGIN }],
            icon: (props: IconProps) => <TreeStructure {...props} />,
          },
        },
      },
      translations,
      graph: {
        builder: ({ parent, plugins }) => {
          const intentPlugin = resolvePlugin(plugins, parseIntentPlugin);

          if (parent.data instanceof Folder && parent.data instanceof SpaceProxy) {
            parent.actionsMap[`${SPACE_PLUGIN}/create`]?.addAction({
              id: `${TREE_PLUGIN}/create`, // TODO(burdon): Uniformly "create".
              label: ['create object label', { ns: TREE_PLUGIN }], // TODO(burdon): "object"
              icon: (props) => <TreeStructure {...props} />,
              // TODO(burdon): Factor out helper.
              invoke: () =>
                intentPlugin?.provides.intent.dispatch([
                  {
                    plugin: TREE_PLUGIN,
                    action: TreeAction.CREATE,
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
              id: `${TREE_PLUGIN}/toggle-checkbox`,
              label: ['toggle checkbox label', { ns: TREE_PLUGIN }],
              icon: (props) => <Check {...props} />,
              invoke: () =>
                intentPlugin?.provides.intent.dispatch({
                  plugin: TREE_PLUGIN,
                  action: TreeAction.TOGGLE_CHECKBOX,
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
            label: ['create stack section label', { ns: TREE_PLUGIN }],
            icon: (props: any) => <TreeStructure {...props} />,
            intent: {
              plugin: TREE_PLUGIN,
              action: TreeAction.CREATE,
            },
          },
        ],
      },
      surface: {
        component: ({ data, role }) => {
          switch (role) {
            case 'main':
              return isObject(data.active) ? <TreeMain tree={data.active as TreeType} /> : null;
            case 'section':
              return isObject(data.object) ? <TreeSection tree={data.object as TreeType} /> : null;
          }

          return null;
        },
      },
      intent: {
        resolver: (intent) => {
          switch (intent.action) {
            case TreeAction.CREATE: {
              return {
                object: new TreeType({
                  root: new TreeType.Item({
                    items: [new TreeType.Item()],
                  }),
                }),
              };
            }

            case TreeAction.TOGGLE_CHECKBOX: {
              (intent.data.object as TreeType).checkbox = !(intent.data.object as TreeType).checkbox;
              break;
            }
          }
        },
      },
    },
  };
};
