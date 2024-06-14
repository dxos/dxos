//
// Copyright 2023 DXOS.org
//

import { type IconProps, Kanban } from '@phosphor-icons/react';
import { batch, effect } from '@preact/signals-core';
import React from 'react';

import { parseClientPlugin } from '@braneframe/plugin-client';
import { parseSpacePlugin, updateGraphWithAddObjectAction } from '@braneframe/plugin-space';
import { KanbanType } from '@braneframe/types';
import { resolvePlugin, type PluginDefinition, parseIntentPlugin } from '@dxos/app-framework';
import { EventSubscriptions } from '@dxos/async';
import { create } from '@dxos/echo-schema';
import { Filter, fullyQualifiedId } from '@dxos/react-client/echo';

import { KanbanMain } from './components';
import meta, { KANBAN_PLUGIN } from './meta';
import translations from './translations';
import { KanbanAction, type KanbanPluginProvides } from './types';

export const KanbanPlugin = (): PluginDefinition<KanbanPluginProvides> => {
  return {
    meta,
    provides: {
      metadata: {
        records: {
          [KanbanType.typename]: {
            placeholder: ['kanban title placeholder', { ns: KANBAN_PLUGIN }],
            icon: (props: IconProps) => <Kanban {...props} />,
          },
        },
      },
      translations,
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
                  plugin: KANBAN_PLUGIN,
                  action: KanbanAction.CREATE,
                  properties: {
                    label: ['create kanban label', { ns: KANBAN_PLUGIN }],
                    icon: (props: IconProps) => <Kanban {...props} />,
                    testId: 'kanbanPlugin.createObject',
                  },
                  dispatch,
                }),
              );
            });

            client.spaces
              .get()
              .filter((space) => !!enabled.find((key) => key.equals(space.key)))
              .forEach((space) => {
                // Add all kanbans to the graph.
                const query = space.db.query(Filter.schema(KanbanType));
                subscriptions.add(query.subscribe());
                let previousObjects: KanbanType[] = [];
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
                            label: object.title || ['object title placeholder', { ns: KANBAN_PLUGIN }],
                            icon: (props: IconProps) => <Kanban {...props} />,
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
              return data.active instanceof KanbanType ? <KanbanMain kanban={data.active} /> : null;
            default:
              return null;
          }
        },
      },
      intent: {
        resolver: (intent) => {
          switch (intent.action) {
            case KanbanAction.CREATE: {
              return { data: create(KanbanType, { columns: [] }) };
            }
          }
        },
      },
    },
  };
};
