//
// Copyright 2023 DXOS.org
//

import { Graph, type IconProps } from '@phosphor-icons/react';
import { batch, effect } from '@preact/signals-core';
import React from 'react';

import { parseClientPlugin } from '@braneframe/plugin-client';
import { parseSpacePlugin, updateGraphWithAddObjectAction } from '@braneframe/plugin-space';
import { ViewType } from '@braneframe/types';
import { parseIntentPlugin, resolvePlugin, type PluginDefinition } from '@dxos/app-framework';
import { EventSubscriptions } from '@dxos/async';
import { Filter, create, fullyQualifiedId } from '@dxos/react-client/echo';

import { ExplorerArticle, ExplorerMain } from './components';
import meta, { EXPLORER_PLUGIN } from './meta';
import translations from './translations';
import { ExplorerAction, type ExplorerPluginProvides } from './types';

export const ExplorerPlugin = (): PluginDefinition<ExplorerPluginProvides> => {
  return {
    meta,
    provides: {
      metadata: {
        records: {
          [ViewType.typename]: {
            placeholder: ['object title placeholder', { ns: EXPLORER_PLUGIN }],
            icon: (props: IconProps) => <Graph {...props} />,
          },
        },
      },
      translations,
      echo: {
        schema: [ViewType],
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
                  plugin: EXPLORER_PLUGIN,
                  action: ExplorerAction.CREATE,
                  properties: {
                    label: ['create object label', { ns: EXPLORER_PLUGIN }],
                    icon: (props: IconProps) => <Graph {...props} />,
                    testId: 'explorerPlugin.createObject',
                  },
                  dispatch,
                }),
              );
            });

            client.spaces
              .get()
              .filter((space) => !!enabled.find((id) => space.id === id))
              .forEach((space) => {
                // Add all views to the graph.
                const query = space.db.query(Filter.schema(ViewType));
                subscriptions.add(query.subscribe());
                let previousObjects: ViewType[] = [];
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
                            label: object.title || ['object title placeholder', { ns: EXPLORER_PLUGIN }],
                            icon: (props: IconProps) => <Graph {...props} />,
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
      surface: {
        component: ({ data, role }) => {
          switch (role) {
            case 'main':
              return data.active instanceof ViewType ? <ExplorerMain view={data.active} /> : null;
            case 'article':
              return data.object instanceof ViewType ? <ExplorerArticle view={data.object} /> : null;
            default:
              return null;
          }
        },
      },
      intent: {
        resolver: (intent) => {
          switch (intent.action) {
            case ExplorerAction.CREATE: {
              return { data: create(ViewType, { title: '', type: '' }) };
            }
          }
        },
      },
    },
  };
};
