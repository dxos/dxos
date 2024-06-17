//
// Copyright 2023 DXOS.org
//

import { Code, type IconProps } from '@phosphor-icons/react';
import { batch, effect } from '@preact/signals-core';
import React, { useMemo } from 'react';

import { parseClientPlugin } from '@braneframe/plugin-client';
import { parseSpacePlugin, updateGraphWithAddObjectAction } from '@braneframe/plugin-space';
import { ScriptType, TextType } from '@braneframe/types';
import { parseIntentPlugin, type PluginDefinition, resolvePlugin } from '@dxos/app-framework';
import { EventSubscriptions } from '@dxos/async';
import { create } from '@dxos/echo-schema';
import { createDocAccessor, Filter, fullyQualifiedId } from '@dxos/react-client/echo';
import { Main } from '@dxos/react-ui';
import {
  baseSurface,
  bottombarBlockPaddingEnd,
  fixedInsetFlexLayout,
  topbarBlockPaddingStart,
} from '@dxos/react-ui-theme';

import { ScriptBlock, type ScriptBlockProps } from './components';
import meta, { SCRIPT_PLUGIN } from './meta';
import translations from './translations';
import { ScriptAction, type ScriptPluginProvides } from './types';

export type ScriptPluginProps = {
  containerUrl: string;
};

export const ScriptPlugin = ({ containerUrl }: ScriptPluginProps): PluginDefinition<ScriptPluginProvides> => {
  return {
    meta,
    provides: {
      metadata: {
        records: {
          [ScriptType.typename]: {
            placeholder: ['object title placeholder', { ns: SCRIPT_PLUGIN }],
            icon: (props: IconProps) => <Code {...props} />,
          },
        },
      },
      translations,
      echo: {
        schema: [ScriptType],
      },
      graph: {
        builder: (plugins, graph) => {
          const client = resolvePlugin(plugins, parseClientPlugin)?.provides.client;
          const enabled = resolvePlugin(plugins, parseSpacePlugin)?.provides.space.enabled;
          const dispatch = resolvePlugin(plugins, parseIntentPlugin)?.provides.intent.dispatch;
          if (!client || !dispatch || !enabled) {
            return;
          }

          const subscriptions = new EventSubscriptions();
          const unsubscribe = effect(() => {
            subscriptions.clear();
            client.spaces.get().forEach((space) => {
              subscriptions.add(
                updateGraphWithAddObjectAction({
                  graph,
                  space,
                  plugin: SCRIPT_PLUGIN,
                  action: ScriptAction.CREATE,
                  properties: {
                    label: ['create object label', { ns: SCRIPT_PLUGIN }],
                    icon: (props: IconProps) => <Code {...props} />,
                    testId: 'scriptPlugin.createObject',
                  },
                  dispatch,
                }),
              );
            });

            client.spaces
              .get()
              .filter((space) => !!enabled.find((id) => id === space.id))
              .forEach((space) => {
                // Add all scripts to the graph.
                const query = space.db.query(Filter.schema(ScriptType));
                subscriptions.add(query.subscribe());
                let previousObjects: ScriptType[] = [];
                subscriptions.add(
                  effect(() => {
                    const removedObjects = previousObjects.filter((object) => !query.objects.includes(object));
                    previousObjects = query.objects;

                    batch(() => {
                      removedObjects.forEach((object) => graph.removeNode(fullyQualifiedId(object)));
                      query.objects.forEach((object) => {
                        graph.addNodes({
                          id: fullyQualifiedId(object),
                          data: object,
                          properties: {
                            // TODO(wittjosiah): Reconcile with metadata provides.
                            label: object.name || ['object title placeholder', { ns: SCRIPT_PLUGIN }],
                            icon: (props: IconProps) => <Code {...props} />,
                            testId: 'spacePlugin.object',
                            persistenceClass: 'echo',
                            persistenceKey: space?.id,
                          },
                        });
                      });
                    });
                  }),
                );
              });
          });

          return () => {
            unsubscribe();
            subscriptions.clear();
          };
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
              return data.active instanceof ScriptType ? (
                <Main.Content
                  classNames={[baseSurface, fixedInsetFlexLayout, topbarBlockPaddingStart, bottombarBlockPaddingEnd]}
                >
                  <ScriptBlockWrapper
                    // prettier-ignore
                    script={data.active}
                    containerUrl={containerUrl}
                    classes={{ toolbar: 'px-1' }}
                  />
                </Main.Content>
              ) : null;
            case 'slide':
              return data.slide instanceof ScriptType ? (
                <ScriptBlockWrapper
                  // prettier-ignore
                  script={data.slide}
                  containerUrl={containerUrl}
                  classes={{ toolbar: 'p-24' }}
                  view='preview'
                  hideSelector
                />
              ) : null;
            case 'section':
              return data.object instanceof ScriptType ? (
                <ScriptBlockWrapper
                  // prettier-ignore
                  script={data.object}
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
              return { data: create(ScriptType, { source: create(TextType, { content: example }) }) };
            }
          }
        },
      },
    },
  };
};

const ScriptBlockWrapper = ({ script, ...props }: { script: ScriptType } & Omit<ScriptBlockProps, 'id' | 'source'>) => {
  const source = useMemo(() => script.source && createDocAccessor(script.source, ['content']), [script.source]);
  return source ? <ScriptBlock id={script.id} source={source} {...props} /> : null;
};

// TODO(burdon): Import.
const example = [
  "import { Filter, useQuery, useSpaces} from '@dxos/react-client/echo';",
  "import { Chart } from '@braneframe/plugin-explorer';",
  '',
  'export default () => {',
  '  const spaces = useSpaces();',
  '  const space = spaces[1];',
  "  const objects = useQuery(space, Filter.typename('example.com/type/contact'));",
  '  return <Chart items={objects} accessor={object => ({ x: object.lat, y: object.lng })} />',
  '}',
].join('\n');
