//
// Copyright 2023 DXOS.org
//

import { Code, type IconProps } from '@phosphor-icons/react';
import React from 'react';

import { SPACE_PLUGIN, SpaceAction } from '@braneframe/plugin-space';
import { Folder, Script as ScriptType } from '@braneframe/types';
import { resolvePlugin, type PluginDefinition, parseIntentPlugin, LayoutAction } from '@dxos/app-framework';
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
        component: ({ data, role }) => {
          switch (role) {
            case 'main':
              return isObject(data.active, ScriptType.schema, ScriptType.filter()) ? (
                <Main.Content classNames={[baseSurface, fixedInsetFlexLayout, topbarBlockPaddingStart]}>
                  <ScriptBlock
                    id={(data.active as any).id}
                    source={(data.active as ScriptType).source}
                    classes={{ toolbar: 'px-2' }}
                    containerUrl={containerUrl}
                  />
                </Main.Content>
              ) : null;
            case 'slide':
              return isObject(data.slide, ScriptType.schema, ScriptType.filter()) ? (
                <ScriptBlock
                  id={(data.slide as any).id}
                  source={(data.slide as ScriptType).source}
                  classes={{ root: 'p-24' }}
                  view='preview'
                  hideSelector
                  containerUrl={containerUrl}
                />
              ) : null;
            case 'section':
              return isObject(data.object, ScriptType.schema, ScriptType.filter()) ? (
                <ScriptBlock
                  id={(data.object as any).id}
                  source={(data.object as ScriptType).source}
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
              return { object: new ScriptType({ source: new TextObject(example) }) };
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
