//
// Copyright 2023 DXOS.org
//

import { Brain, WebhooksLogo, type IconProps } from '@phosphor-icons/react';
import { batch, effect } from '@preact/signals-core';
import React from 'react';

import { parseClientPlugin } from '@braneframe/plugin-client';
import { parseSpacePlugin, updateGraphWithAddObjectAction } from '@braneframe/plugin-space';
import { ChainPromptType, ChainType } from '@braneframe/types';
import { parseIntentPlugin, type PluginDefinition, resolvePlugin } from '@dxos/app-framework';
import { EventSubscriptions } from '@dxos/async';
import { create } from '@dxos/echo-schema';
import { FunctionTrigger } from '@dxos/functions/types';
import { Filter, fullyQualifiedId } from '@dxos/react-client/echo';

import { ChainArticle, ChainMain, TriggerArticle } from './components';
import meta, { CHAIN_PLUGIN } from './meta';
import translations from './translations';
import { ChainAction, type ChainPluginProvides } from './types';

export const ChainPlugin = (): PluginDefinition<ChainPluginProvides> => {
  return {
    meta,
    provides: {
      metadata: {
        records: {
          [ChainType.typename]: {
            placeholder: ['object placeholder', { ns: CHAIN_PLUGIN }],
            icon: (props: IconProps) => <Brain {...props} />,
          },
          [FunctionTrigger.typename]: {
            placeholder: ['trigger placeholder', { ns: CHAIN_PLUGIN }],
            icon: (props: IconProps) => <WebhooksLogo {...props} />,
          },
        },
      },
      translations,
      echo: {
        schema: [ChainType, ChainPromptType, FunctionTrigger],
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
                  plugin: CHAIN_PLUGIN,
                  action: ChainAction.CREATE,
                  properties: {
                    label: ['create object label', { ns: CHAIN_PLUGIN }],
                    icon: (props: IconProps) => <Brain {...props} />,
                    testId: 'chainPlugin.createObject',
                  },
                  dispatch,
                }),
              );
            });

            client.spaces
              .get()
              .filter((space) => !!enabled.find((key) => key.equals(space.key)))
              .forEach((space) => {
                // Add all chains to the graph.
                const promptQuery = space.db.query(Filter.schema(ChainType));
                subscriptions.add(promptQuery.subscribe());
                let previousObjects: ChainType[] = [];
                subscriptions.add(
                  effect(() => {
                    const removedObjects = previousObjects.filter((object) => !promptQuery.objects.includes(object));
                    previousObjects = promptQuery.objects;

                    batch(() => {
                      removedObjects.forEach((object) => graph.removeNode(fullyQualifiedId(object)));
                      promptQuery.objects.forEach((object) => {
                        graph.addNodes({
                          id: fullyQualifiedId(object),
                          data: object,
                          properties: {
                            // TODO(wittjosiah): Reconcile with metadata provides.
                            label: object.title || ['object title placeholder', { ns: CHAIN_PLUGIN }],
                            icon: (props: IconProps) => <WebhooksLogo {...props} />,
                            testId: 'spacePlugin.object',
                            persistenceClass: 'echo',
                            persistenceKey: space?.key.toHex(),
                          },
                        });
                      });
                    });
                  }),
                );

                const functionTriggerQuery = space.db.query(Filter.schema(FunctionTrigger));
                subscriptions.add(functionTriggerQuery.subscribe());
                subscriptions.add(
                  effect(() => {
                    const removedObjects = previousObjects.filter((object) => !promptQuery.objects.includes(object));
                    previousObjects = functionTriggerQuery.objects;

                    batch(() => {
                      removedObjects.forEach((object) => graph.removeNode(fullyQualifiedId(object)));
                      functionTriggerQuery.objects.forEach((object) => {
                        graph.addNodes({
                          id: fullyQualifiedId(object),
                          data: object,
                          properties: {
                            // TODO(wittjosiah): Reconcile with metadata provides.
                            label: `trigger-${object.id.substring(0, 8)}` || [
                              'object title placeholder',
                              { ns: CHAIN_PLUGIN },
                            ],
                            icon: (props: IconProps) => <WebhooksLogo {...props} />,
                            testId: 'spacePlugin.object',
                            persistenceClass: 'echo',
                            persistenceKey: space?.key.toHex(),
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
            id: 'create-stack-section-chain',
            testId: 'chainPlugin.createSectionSpaceChain',
            label: ['create stack section label', { ns: CHAIN_PLUGIN }],
            icon: (props: any) => <Brain {...props} />,
            intent: {
              plugin: CHAIN_PLUGIN,
              action: ChainAction.CREATE,
            },
          },
        ],
      },
      surface: {
        component: ({ data, role }) => {
          switch (role) {
            case 'main':
              return data.active instanceof ChainType ? <ChainMain chain={data.active} /> : null;
            case 'article': {
              if (data.object instanceof ChainType) {
                return <ChainArticle chain={data.object} />;
              }
              if (data.object instanceof FunctionTrigger) {
                return <TriggerArticle trigger={data.object} />;
              }
              break;
            }

            case 'section': {
              if (data.object instanceof FunctionTrigger) {
                return <TriggerArticle trigger={data.object} />;
              }
            }
          }

          return null;
        },
      },
      intent: {
        resolver: (intent) => {
          switch (intent.action) {
            case ChainAction.CREATE: {
              return {
                data: create(FunctionTrigger, { function: '', spec: { type: 'timer', cron: '' } }),
              };
            }
          }
        },
      },
    },
  };
};
