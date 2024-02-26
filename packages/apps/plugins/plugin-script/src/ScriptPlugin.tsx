//
// Copyright 2023 DXOS.org
//

import { Code, type IconProps } from '@phosphor-icons/react';
import React, { type FC, useEffect, useMemo } from 'react';

import { SPACE_PLUGIN, SpaceAction } from '@braneframe/plugin-space';
import { Folder, Script as ScriptType } from '@braneframe/types';
import { resolvePlugin, type PluginDefinition, parseIntentPlugin, NavigationAction } from '@dxos/app-framework';
import { createDocAccessor } from '@dxos/echo-schema';
import {
  type Filter,
  type EchoObject,
  type Schema,
  TextObject,
  isTypedObject,
  SpaceProxy,
} from '@dxos/react-client/echo';
import { Main } from '@dxos/react-ui';
import { baseSurface, fixedInsetFlexLayout, topbarBlockPaddingStart } from '@dxos/react-ui-theme';

import { ScriptBlock } from './components';
import meta, { SCRIPT_PLUGIN } from './meta';
import translations from './translations';
import { ScriptAction, type ScriptPluginProvides } from './types';

// TODO(burdon): Make generic and remove need for filter.
const isObject = <T extends EchoObject>(object: unknown, schema: Schema, filter: Filter<T>): T | undefined => {
  return isTypedObject(object) && object.__typename === schema.typename ? (object as T) : undefined;
};

(globalThis as any)[ScriptType.name] = ScriptType;

export type ScriptPluginProps = {
  containerUrl: string;
};

export const ScriptPlugin = ({ containerUrl }: ScriptPluginProps): PluginDefinition<ScriptPluginProvides> => {
  return {
    meta,
    provides: {
      metadata: {
        records: {
          [ScriptType.schema.typename]: {
            placeholder: ['object title placeholder', { ns: SCRIPT_PLUGIN }],
            icon: (props: IconProps) => <Code {...props} />,
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
                  data: { target: parent.data },
                },
                {
                  action: NavigationAction.ACTIVATE,
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
        component: ({ data, role }) => {
          switch (role) {
            case 'main':
              return isObject(data.active, ScriptType.schema, ScriptType.filter()) ? (
                <Editor script={data.active as ScriptType} containerUrl={containerUrl} />
              ) : null;
            case 'slide':
              return isObject(data.slide, ScriptType.schema, ScriptType.filter()) ? (
                <ScriptBlock
                  id={(data.slide as any).id}
                  source={createDocAccessor((data.slide as ScriptType).source)}
                  containerUrl={containerUrl}
                  classes={{ root: 'p-24' }}
                  view='preview'
                  hideSelector
                />
              ) : null;
            case 'section':
              return isObject(data.object, ScriptType.schema, ScriptType.filter()) ? (
                <ScriptBlock
                  id={(data.object as any).id}
                  source={createDocAccessor((data.object as ScriptType).source)}
                  containerUrl={containerUrl}
                  classes={{ root: 'h-[400px] py-2' }}
                />
              ) : null;
          }

          return null;
        },
      },
      intent: {
        resolver: (intent, plugins) => {
          switch (intent.action) {
            case ScriptAction.CREATE: {
              return { data: new ScriptType({ source: new TextObject(example) }) };
            }
          }
        },
      },
    },
  };
};

// TODO(burdon): Import.
const example = [
  "import { Filter, useQuery, useSpaces} from '@dxos/react-client/echo';",
  "import { Chart } from '@braneframe/plugin-explorer';",
  '',
  'export default () => {',
  '  const spaces = useSpaces();',
  '  const space = spaces[1];',
  "  const objects = useQuery(space, Filter.typename('example.com/schema/contact'));",
  '  return <Chart items={objects} accessor={object => ({ x: object.lat, y: object.lng })} />',
  '}',
].join('\n');

// let lastSource;
// let lastObj;
// let lastScript;

const Editor: FC<{ script: ScriptType; containerUrl: string }> = ({ script, containerUrl }) => {
  const source = useMemo(() => createDocAccessor(script.source), [script.source]);

  // console.log('Editor', {
  //   scriptId: script.id,
  //   script,
  //   source: source === lastSource,
  //   obj: lastObj === script.source,
  //   scriptCh: lastScript === script,
  // });
  // lastSource = source;
  // lastObj = script.source;
  // lastScript = script;

  useEffect(() => {
    console.log('mount editor');
  }, []);

  return (
    <Main.Content classNames={[baseSurface, fixedInsetFlexLayout, topbarBlockPaddingStart]}>
      <ScriptBlock id={script.id} source={source} classes={{ toolbar: 'px-2' }} containerUrl={containerUrl} />
    </Main.Content>
  );
};
