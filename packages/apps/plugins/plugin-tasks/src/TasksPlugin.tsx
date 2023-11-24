//
// Copyright 2023 DXOS.org
//

import { Asterisk, type IconProps } from '@phosphor-icons/react';
import React from 'react';

import { SPACE_PLUGIN, SpaceAction } from '@braneframe/plugin-space';
import { Folder, Task as TaskType } from '@braneframe/types';
import { resolvePlugin, parseIntentPlugin, LayoutAction, type PluginDefinition } from '@dxos/app-framework';
import { SpaceProxy } from '@dxos/react-client/echo';

import { TaskMain } from './components';
import meta, { TASKS_PLUGIN } from './meta';
import translations from './translations';
import { TasksAction, type TasksPluginProvides, isObject } from './types';

// TODO(wittjosiah): This ensures that typed objects are not proxied by deepsignal. Remove.
// https://github.com/luisherranz/deepsignal/issues/36
(globalThis as any)[TaskType.name] = TaskType;

const typename = 'tasks'; // Type.schema.typename

export const TasksPlugin = (): PluginDefinition<TasksPluginProvides> => {
  return {
    meta,
    provides: {
      metadata: {
        records: {
          [typename]: {
            placeholder: ['object placeholder', { ns: TASKS_PLUGIN }],
            icon: (props: IconProps) => <Asterisk {...props} />,
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
            id: `${TASKS_PLUGIN}/create`, // TODO(burdon): Uniformly "create".
            label: ['create object label', { ns: TASKS_PLUGIN }], // TODO(burdon): "object"
            icon: (props) => <Asterisk {...props} />,
            // TODO(burdon): Factor out helper.
            invoke: () =>
              intentPlugin?.provides.intent.dispatch([
                {
                  plugin: TASKS_PLUGIN,
                  action: TasksAction.CREATE,
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
              testId: 'taskPlugin.createObject',
            },
          });
        },
      },
      surface: {
        component: ({ data, role }) => {
          switch (role) {
            case 'main': {
              return isObject(data.active) ? <TaskMain task={data.active as TaskType} /> : null;
            }
          }

          return null;
        },
      },
      intent: {
        resolver: (intent) => {
          switch (intent.action) {
            case TasksAction.CREATE: {
              return { object: new TaskType() };
            }
          }
        },
      },
    },
  };
};
