//
// Copyright 2023 DXOS.org
//

import { type IconProps, Kanban } from '@phosphor-icons/react';
import { batch, effect } from '@preact/signals-core';
import React from 'react';

import { parseClientPlugin } from '@braneframe/plugin-client';
import { updateGraphWithAddObjectAction } from '@braneframe/plugin-space';
import { Kanban as KanbanType } from '@braneframe/types';
import { resolvePlugin, type PluginDefinition, parseIntentPlugin } from '@dxos/app-framework';
import { EventSubscriptions } from '@dxos/async';

import { KanbanMain } from './components';
import meta, { KANBAN_PLUGIN } from './meta';
import translations from './translations';
import { KanbanAction, type KanbanPluginProvides, isKanban } from './types';

export const KanbanPlugin = (): PluginDefinition<KanbanPluginProvides> => {
  return {
    meta,
    provides: {
      metadata: {
        records: {
          [KanbanType.schema.typename]: {
            placeholder: ['kanban title placeholder', { ns: KANBAN_PLUGIN }],
            icon: (props: IconProps) => <Kanban {...props} />,
          },
        },
      },
      translations,
      graph: {
        builder: (plugins, graph) => {
          const client = resolvePlugin(plugins, parseClientPlugin)?.provides.client;
          const dispatch = resolvePlugin(plugins, parseIntentPlugin)?.provides.intent.dispatch;
          if (!client || !dispatch) {
            return;
          }

          const subscriptions = new EventSubscriptions();
          const { unsubscribe } = client.spaces.subscribe((spaces) => {
            spaces.forEach((space) => {
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

              // Add all kanbans to the graph.
              const query = space.db.query(KanbanType.filter());
              let previousObjects: KanbanType[] = [];
              subscriptions.add(
                effect(() => {
                  const removedObjects = previousObjects.filter((object) => !query.objects.includes(object));
                  previousObjects = query.objects;

                  batch(() => {
                    removedObjects.forEach((object) => graph.removeNode(object.id));
                    query.objects.forEach((object) => {
                      graph.addNodes({
                        id: object.id,
                        data: object,
                        properties: {
                          // TODO(wittjosiah): Reconcile with metadata provides.
                          label: object.title || ['object title placeholder', { ns: KANBAN_PLUGIN }],
                          icon: (props: IconProps) => <Kanban {...props} />,
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
      surface: {
        component: ({ data, role }) => {
          switch (role) {
            case 'main':
              return isKanban(data.active) ? <KanbanMain kanban={data.active} /> : null;
            default:
              return null;
          }
        },
      },
      intent: {
        resolver: (intent) => {
          switch (intent.action) {
            case KanbanAction.CREATE: {
              return { data: new KanbanType() };
            }
          }
        },
      },
    },
  };
};
