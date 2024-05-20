//
// Copyright 2023 DXOS.org
//

import { Compass, type IconProps } from '@phosphor-icons/react';
import { batch, effect } from '@preact/signals-core';
import React from 'react';

import { parseClientPlugin } from '@braneframe/plugin-client';
import { parseSpacePlugin, updateGraphWithAddObjectAction } from '@braneframe/plugin-space';
import { MapType } from '@braneframe/types';
import { resolvePlugin, type PluginDefinition, parseIntentPlugin } from '@dxos/app-framework';
import { EventSubscriptions } from '@dxos/async';
import { create } from '@dxos/echo-schema';
import { Filter } from '@dxos/react-client/echo';

import { MapMain, MapSection } from './components';
import meta, { MAP_PLUGIN } from './meta';
import translations from './translations';
import { MapAction, type MapPluginProvides } from './types';

export const MapPlugin = (): PluginDefinition<MapPluginProvides> => {
  return {
    meta,
    provides: {
      metadata: {
        records: {
          [MapType.typename]: {
            placeholder: ['object title placeholder', { ns: MAP_PLUGIN }],
            icon: (props: IconProps) => <Compass {...props} />,
          },
        },
      },
      translations,
      echo: {
        schema: [MapType],
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
                  plugin: MAP_PLUGIN,
                  action: MapAction.CREATE,
                  properties: {
                    label: ['create object label', { ns: MAP_PLUGIN }],
                    icon: (props: IconProps) => <Compass {...props} />,
                    testId: 'mapPlugin.createObject',
                  },
                  dispatch,
                }),
              );
            });

            client.spaces
              .get()
              .filter((space) => !!enabled.find((key) => key.equals(space.key)))
              .forEach((space) => {
                // Add all maps to the graph.
                const query = space.db.query(Filter.schema(MapType));
                subscriptions.add(query.subscribe());
                let previousObjects: MapType[] = [];
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
                            label: object.title || ['object title placeholder', { ns: MAP_PLUGIN }],
                            icon: (props: IconProps) => <Compass {...props} />,
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
            id: 'create-stack-section-map',
            testId: 'mapPlugin.createSectionSpaceMap',
            label: ['create stack section label', { ns: MAP_PLUGIN }],
            icon: (props: any) => <Compass {...props} />,
            intent: [
              {
                plugin: MAP_PLUGIN,
                action: MapAction.CREATE,
              },
            ],
          },
        ],
      },
      surface: {
        component: ({ data, role }) => {
          switch (role) {
            case 'main': {
              return data.active instanceof MapType ? <MapMain map={data.active} /> : null;
            }
            case 'section': {
              return data.object instanceof MapType ? <MapSection map={data.object} /> : null;
            }
          }

          return null;
        },
      },
      intent: {
        resolver: (intent) => {
          switch (intent.action) {
            case MapAction.CREATE: {
              return { data: create(MapType, {}) };
            }
          }
        },
      },
    },
  };
};
