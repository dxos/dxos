//
// Copyright 2023 DXOS.org
//

import { Code } from '@phosphor-icons/react';
import React from 'react';

import { SpaceAction } from '@braneframe/plugin-space';
import { Script as ScriptType } from '@braneframe/types';
import { resolvePlugin, type PluginDefinition, parseIntentPlugin, LayoutAction } from '@dxos/app-framework';
import { SpaceProxy } from '@dxos/client/echo';
import { type Filter, type EchoObject, type Schema, isTypedObject } from '@dxos/client/echo';

import { ScriptEditor } from './components';
import translations from './translations';
import { SCRIPT_PLUGIN, ScriptAction, type ScriptPluginProvides } from './types';

// TODO(burdon): Make generic and remove need for filter.
const isObject = <T extends EchoObject>(object: any, schema: Schema, filter: Filter<T>): T | undefined => {
  return isTypedObject(object) && object.__typename === schema.__typename ? (object as T) : undefined;
};

export const ScriptPlugin = (): PluginDefinition<ScriptPluginProvides> => {
  return {
    meta: {
      id: SCRIPT_PLUGIN,
    },
    provides: {
      translations,
      graph: {
        builder: ({ parent, plugins }) => {
          if (!(parent.data instanceof SpaceProxy)) {
            // TODO(burdon): Space (don't expose Proxy)
            return;
          }

          const space = parent.data;
          const intentPlugin = resolvePlugin(plugins, parseIntentPlugin);

          parent.actionsMap['create-object-group']?.addAction({
            id: `${SCRIPT_PLUGIN}/create`,
            label: ['create object label', { ns: SCRIPT_PLUGIN }],
            icon: (props) => <Code {...props} />,
            invoke: () =>
              intentPlugin?.provides.intent.dispatch([
                {
                  plugin: SCRIPT_PLUGIN,
                  action: ScriptAction.CREATE,
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
              testId: 'scriptPlugin.createObject',
            },
          });
        },
      },
      stack: {
        creators: [
          {
            id: 'create-stack-section-script',
            testId: 'scriptPlugin.createSectionSpaceScript',
            label: ['create stack section label', { ns: SCRIPT_PLUGIN }],
            icon: (props: any) => <Code {...props} />,
            intent: {
              plugin: SCRIPT_PLUGIN,
              action: ScriptAction.CREATE,
            },
          },
        ],
      },
      surface: {
        component: (data, role) => {
          const object = isObject<ScriptType>(data, ScriptType.schema, ScriptType.filter());
          if (!object) {
            return null;
          }

          // TODO(burdon): Compare with Sketch (types).
          switch (role) {
            case 'section':
              return <ScriptEditor content={object.content} />;
          }
        },
      },
      intent: {
        resolver: (intent, plugins) => {
          switch (intent.action) {
            default:
              break;
          }
        },
      },
    },
  };
};
