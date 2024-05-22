//
// Copyright 2023 DXOS.org
//

import { Brain, type IconProps } from '@phosphor-icons/react';
import { batch, effect } from '@preact/signals-core';
import React from 'react';

import { parseClientPlugin } from '@braneframe/plugin-client';
import { parseSpacePlugin, updateGraphWithAddObjectAction } from '@braneframe/plugin-space';
import { ChainPromptType, ChainType } from '@braneframe/types';
import { parseIntentPlugin, type PluginDefinition, resolvePlugin } from '@dxos/app-framework';
import { EventSubscriptions } from '@dxos/async';
import { create } from '@dxos/echo-schema';
import { Filter, fullyQualifiedId } from '@dxos/react-client/echo';

import { ChainArticle, ChainMain } from './components';
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
        },
      },
      translations,
      echo: {
        schema: [ChainType, ChainPromptType],
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
                const query = space.db.query(Filter.schema(ChainType));
                subscriptions.add(query.subscribe());
                let previousObjects: ChainType[] = [];
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
                            label: object.title || ['object title placeholder', { ns: CHAIN_PLUGIN }],
                            icon: (props: IconProps) => <Brain {...props} />,
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
            case 'article':
              return data.object instanceof ChainType ? <ChainArticle chain={data.object} /> : null;
          }

          return null;
        },
      },
      intent: {
        resolver: (intent) => {
          switch (intent.action) {
            case ChainAction.CREATE: {
              return {
                data: create(ChainType, { prompts: [] }),
              };
            }
          }
        },
      },
    },
  };
};
