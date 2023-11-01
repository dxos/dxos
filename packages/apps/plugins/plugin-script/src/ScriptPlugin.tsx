//
// Copyright 2023 DXOS.org
//

import { Code } from '@phosphor-icons/react';
import React from 'react';

import { Script as ScriptType } from '@braneframe/types';
import { type PluginDefinition } from '@dxos/app-framework';
import { type Filter, type EchoObject, type Schema, isTypedObject } from '@dxos/client/echo';

import { ScriptEditor } from './components';
import translations from './translations';
import { SCRIPT_PLUGIN, ScriptAction, type ScriptPluginProvides } from './types';

// TODO(burdon): Make generic and remove need for filter.
const isObject = <T extends EchoObject>(object: any, schema: Schema, filter: Filter<T>): T | undefined => {
  return isTypedObject(object) && object.__typename === schema.typename ? (object as T) : undefined;
};

export const ScriptPlugin = (): PluginDefinition<ScriptPluginProvides> => {
  return {
    meta: {
      id: SCRIPT_PLUGIN,
    },
    provides: {
      translations,
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
          const object = isObject(data.object, ScriptType.schema, ScriptType.filter());
          if (!object) {
            return null;
          }

          switch (role) {
            case 'section':
              return <ScriptEditor className={'h-[300px]'} content={object.content} />;
          }
        },
      },
      intent: {
        resolver: (intent, plugins) => {
          switch (intent.action) {
            case ScriptAction.CREATE: {
              return { object: new ScriptType() };
            }
          }
        },
      },
    },
  };
};
