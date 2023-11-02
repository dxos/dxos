//
// Copyright 2023 DXOS.org
//

import { Code } from '@phosphor-icons/react';
import React from 'react';

import { Script as ScriptType } from '@braneframe/types';
import { type PluginDefinition } from '@dxos/app-framework';
import { type Filter, type EchoObject, type Schema, TextObject, isTypedObject } from '@dxos/client/echo';

import { ScriptMain, ScriptSection } from './components';
import translations from './translations';
import { SCRIPT_PLUGIN, ScriptAction, type ScriptPluginProvides } from './types';

// TODO(burdon): Make generic and remove need for filter.
const isObject = <T extends EchoObject>(object: any, schema: Schema, filter: Filter<T>): T | undefined => {
  return isTypedObject(object) && object.__typename === schema.typename ? (object as T) : undefined;
};

export type ScriptPluginProps = {
  mainUrl: string;
};

export const ScriptPlugin = ({ mainUrl }: ScriptPluginProps): PluginDefinition<ScriptPluginProvides> => {
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
            case 'main':
              return <ScriptMain source={object.source} mainUrl={mainUrl} />;
            case 'section':
              return <ScriptSection source={object.source} mainUrl={mainUrl} className={'h-[500px]'} />;
          }
        },
      },
      intent: {
        resolver: (intent, plugins) => {
          switch (intent.action) {
            case ScriptAction.CREATE: {
              return { object: new ScriptType({ source: new TextObject(code) }) };
            }
          }
        },
      },
    },
  };
};

const code = [
  "import React from 'react';",
  "import { useSpace, useQuery } from '@dxos/react-client/echo';",
  "import { Chart } from '@braneframe/plugin-explorer';",
  '',
  'const Component = () => {',
  '  const space = useSpace();',
  "  const objects = useQuery(space, obj => obj.__typename === 'dxos.org/schema/person');",
  '  return <Chart items={objects} accessor={object => ({ x: object.lat, y: object.lng })} />',
  '}',
  '',
  'export default Component;',
].join('\n');
