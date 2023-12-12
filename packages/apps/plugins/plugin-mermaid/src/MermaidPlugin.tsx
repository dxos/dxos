//
// Copyright 2023 DXOS.org
//

import { AnchorSimple, type IconProps } from '@phosphor-icons/react';
import React from 'react';

import { SPACE_PLUGIN, SpaceAction } from '@braneframe/plugin-space';
import { Folder, Mermaid as MermaidType } from '@braneframe/types';
import { resolvePlugin, parseIntentPlugin, LayoutAction, type PluginDefinition } from '@dxos/app-framework';
import { TextObject, SpaceProxy } from '@dxos/react-client/echo';
import { Main } from '@dxos/react-ui';
import { baseSurface, fixedInsetFlexLayout, topbarBlockPaddingStart } from '@dxos/react-ui-theme';

import { MermaidEditor } from './components';
import meta, { MERMAID_PLUGIN } from './meta';
import translations from './translations';
import { MermaidAction, type MermaidPluginProvides, isObject } from './types';

(globalThis as any)[MermaidType.name] = MermaidType;

export const MermaidPlugin = (): PluginDefinition<MermaidPluginProvides> => {
  return {
    meta,
    provides: {
      metadata: {
        records: {
          [MermaidType.schema.typename]: {
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
      stack: {
        creators: [
          {
            id: 'create-stack-section-mermaid',
            testId: 'mermaidPlugin.createSectionSpaceMermaid',
            label: ['create stack section label', { ns: MERMAID_PLUGIN }],
            icon: (props: any) => <AnchorSimple {...props} />,
            intent: {
              plugin: MERMAID_PLUGIN,
              action: MermaidAction.CREATE,
            },
          },
        ],
      },
      surface: {
        component: ({ data, role }) => {
          switch (role) {
            case 'main':
              return isObject(data.active) ? (
                <Main.Content classNames={[baseSurface, fixedInsetFlexLayout, topbarBlockPaddingStart]}>
                  <MermaidEditor
                    id={(data.active as any).id}
                    source={(data.active as MermaidType).source}
                    classes={{ toolbar: 'px-2' }}
                  />
                </Main.Content>
              ) : null;
            case 'slide':
              return isObject(data.slide) ? (
                <MermaidEditor
                  id={(data.active as any).id}
                  source={(data.slide as MermaidType).source}
                  classes={{ root: 'p-24' }}
                  view='preview'
                  hideSelector
                />
              ) : null;
            case 'section':
              return isObject(data.object) ? (
                <MermaidEditor
                  id={(data.object as any).id}
                  source={(data.object as MermaidType).source}
                  classes={{ root: 'h-[400px] py-2' }}
                  view='preview'
                />
              ) : null;
          }

          return null;
        },
      },
      intent: {
        resolver: (intent) => {
          switch (intent.action) {
            case MermaidAction.CREATE: {
              return {
                object: new MermaidType({
                  source: new TextObject(examples.flowchart),
                }),
              };
            }
          }
        },
      },
    },
  };
};

const examples = {
  graph: ['graph TD', '', 'A-->B', 'A-->C', 'B-->D', 'C-->D', 'D-->E', 'C-->B', 'B-->E;'].join('\n'),
  flowchart: [
    'flowchart LR',
    '',
    'A[Start] -->|run| B(Test)',
    'B --> C{Decision}',
    'C -->|true| D[Result 1]',
    'C -->|false| E[Result 2]',
  ].join('\n'),
};
