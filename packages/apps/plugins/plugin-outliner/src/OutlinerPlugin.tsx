//
// Copyright 2023 DXOS.org
//

import { TreeStructure, type IconProps, Check } from '@phosphor-icons/react';
import { effect } from '@preact/signals-core';
import React from 'react';

import { parseClientPlugin } from '@braneframe/plugin-client';
import { updateGraphWithAddObjectAction } from '@braneframe/plugin-space';
import { Tree as TreeType } from '@braneframe/types';
import { resolvePlugin, parseIntentPlugin, type PluginDefinition } from '@dxos/app-framework';
import { EventSubscriptions } from '@dxos/async';

import { OutlinerMain, TreeSection } from './components';
import meta, { OUTLINER_PLUGIN } from './meta';
import translations from './translations';
import { OutlinerAction, type OutlinerPluginProvides, isObject } from './types';

export const OutlinerPlugin = (): PluginDefinition<OutlinerPluginProvides> => {
  return {
    meta,
    provides: {
      metadata: {
        records: {
          [TreeType.schema.typename]: {
            placeholder: ['object placeholder', { ns: OUTLINER_PLUGIN }],
            icon: (props: IconProps) => <TreeStructure {...props} />,
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
              const query = space.db.query(TreeType.filter());
              let previousObjects: TreeType[] = [];
              subscriptions.add(
                effect(() => {
                  const removedObjects = previousObjects.filter((object) => !query.objects.includes(object));
                  previousObjects = query.objects;
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
              return isObject(data.active) ? <OutlinerMain tree={data.active as TreeType} /> : null;
            case 'section':
              return isObject(data.object) ? <TreeSection tree={data.object as TreeType} /> : null;
          }

          return null;
        },
      },
      intent: {
        resolver: (intent) => {
          switch (intent.action) {
            case OutlinerAction.CREATE: {
              return {
                data: new TreeType({
                  root: new TreeType.Item({
                    items: [new TreeType.Item()],
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
