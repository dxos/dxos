//
// Copyright 2023 DXOS.org
//

import { TreeStructure, type IconProps, Check } from '@phosphor-icons/react';
import { batch, effect } from '@preact/signals-core';
import React from 'react';

import { parseClientPlugin } from '@braneframe/plugin-client';
import { updateGraphWithAddObjectAction } from '@braneframe/plugin-space';
import { TextV0Type, TreeItemType, TreeType } from '@braneframe/types';
import { resolvePlugin, parseIntentPlugin, type PluginDefinition } from '@dxos/app-framework';
import { EventSubscriptions } from '@dxos/async';
import { create, Filter } from '@dxos/echo-schema';

import { OutlinerMain, TreeSection } from './components';
import meta, { OUTLINER_PLUGIN } from './meta';
import translations from './translations';
import { OutlinerAction, type OutlinerPluginProvides } from './types';

export const OutlinerPlugin = (): PluginDefinition<OutlinerPluginProvides> => {
  return {
    meta,
    provides: {
      metadata: {
        records: {
          [TreeType.typename]: {
            placeholder: ['object placeholder', { ns: OUTLINER_PLUGIN }],
            icon: (props: IconProps) => <TreeStructure {...props} />,
          },
        },
      },
      echo: {
        schema: [TreeItemType, TreeType],
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
            subscriptions.clear();
            spaces.forEach((space) => {
              subscriptions.add(
                updateGraphWithAddObjectAction({
                  graph,
                  space,
                  plugin: OUTLINER_PLUGIN,
                  action: OutlinerAction.CREATE,
                  properties: {
                    label: ['create object label', { ns: OUTLINER_PLUGIN }],
                    icon: (props: IconProps) => <TreeStructure {...props} />,
                    testId: 'outlinerPlugin.createObject',
                  },
                  dispatch,
                }),
              );

              // Add all outlines to the graph.
              const query = space.db.query(Filter.schema(TreeType));
              subscriptions.add(query.subscribe());
              let previousObjects: TreeType[] = [];
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
                          label: object.title || ['object title placeholder', { ns: OUTLINER_PLUGIN }],
                          icon: (props: IconProps) => <TreeStructure {...props} />,
                          testId: 'spacePlugin.object',
                          persistenceClass: 'echo',
                          persistenceKey: space?.key.toHex(),
                        },
                        nodes: [
                          {
                            id: `${OutlinerAction.TOGGLE_CHECKBOX}/${object.id}`,
                            data: () =>
                              dispatch({
                                plugin: OUTLINER_PLUGIN,
                                action: OutlinerAction.TOGGLE_CHECKBOX,
                                data: { object },
                              }),
                            properties: {
                              label: ['toggle checkbox label', { ns: OUTLINER_PLUGIN }],
                              icon: (props: IconProps) => <Check {...props} />,
                            },
                          },
                        ],
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
            id: 'create-stack-section-tree',
            testId: 'treePlugin.createSectionSpaceTree',
            label: ['create stack section label', { ns: OUTLINER_PLUGIN }],
            icon: (props: any) => <TreeStructure {...props} />,
            intent: {
              plugin: OUTLINER_PLUGIN,
              action: OutlinerAction.CREATE,
            },
          },
        ],
      },
      surface: {
        component: ({ data, role }) => {
          switch (role) {
            case 'main':
              return data.active instanceof TreeType ? <OutlinerMain tree={data.active} /> : null;
            case 'section':
              return data.object instanceof TreeType ? <TreeSection tree={data.object} /> : null;
          }

          return null;
        },
      },
      intent: {
        resolver: (intent) => {
          switch (intent.action) {
            case OutlinerAction.CREATE: {
              return {
                data: create(TreeType, {
                  root: create(TreeItemType, {
                    text: create(TextV0Type, { content: '' }),
                    items: [create(TreeItemType, { text: create(TextV0Type, { content: '' }), items: [] })],
                  }),
                }),
              };
            }

            case OutlinerAction.TOGGLE_CHECKBOX: {
              if (intent.data?.object instanceof TreeType) {
                intent.data.object.checkbox = !intent.data.object.checkbox;
                return { data: true };
              }
              break;
            }
          }
        },
      },
    },
  };
};
