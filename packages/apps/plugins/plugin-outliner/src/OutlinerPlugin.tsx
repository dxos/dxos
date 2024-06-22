//
// Copyright 2023 DXOS.org
//

import { TreeStructure, type IconProps, Check } from '@phosphor-icons/react';
import { batch, effect } from '@preact/signals-core';
import React from 'react';

import { parseClientPlugin } from '@braneframe/plugin-client';
import { parseSpacePlugin, updateGraphWithAddObjectAction } from '@braneframe/plugin-space';
import { TreeItemType, TreeType } from '@braneframe/types';
import { resolvePlugin, parseIntentPlugin, type PluginDefinition } from '@dxos/app-framework';
import { EventSubscriptions } from '@dxos/async';
import { create } from '@dxos/echo-schema';
import { Filter, fullyQualifiedId } from '@dxos/react-client/echo';

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
            });

            client.spaces
              .get()
              .filter((space) => !!enabled.find((id) => id === space.id))
              .forEach((space) => {
                // Add all outlines to the graph.
                const query = space.db.query(Filter.schema(TreeType));
                subscriptions.add(query.subscribe());
                let previousObjects: TreeType[] = [];
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
                            label: object.name || ['object title placeholder', { ns: OUTLINER_PLUGIN }],
                            icon: (props: IconProps) => <TreeStructure {...props} />,
                            testId: 'spacePlugin.object',
                            persistenceClass: 'echo',
                            persistenceKey: space?.id,
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
                    content: '',
                    items: [create(TreeItemType, { content: '', items: [] })],
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
