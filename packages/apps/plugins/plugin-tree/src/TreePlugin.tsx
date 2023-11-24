//
// Copyright 2023 DXOS.org
//

import { Check, type IconProps } from '@phosphor-icons/react';
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
            icon: (props: IconProps) => <Check {...props} />,
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
            id: `${TREE_PLUGIN}/create`, // TODO(burdon): Uniformly "create".
            label: ['create object label', { ns: TREE_PLUGIN }], // TODO(burdon): "object"
            icon: (props) => <Check {...props} />,
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
        },
      },
      stack: {
        creators: [
          {
            id: 'create-stack-section-tree',
            testId: 'treePlugin.createSectionSpaceTree',
            label: ['create stack section label', { ns: TREE_PLUGIN }],
            icon: (props: any) => <Check {...props} />,
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
          }
        },
      },
    },
  };
};
