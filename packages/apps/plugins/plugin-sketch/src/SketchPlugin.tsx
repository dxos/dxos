//
// Copyright 2023 DXOS.org
//

import { CompassTool, type IconProps } from '@phosphor-icons/react';
import { batch, effect } from '@preact/signals-core';
import React from 'react';

import { parseClientPlugin } from '@braneframe/plugin-client';
import { parseSpacePlugin, updateGraphWithAddObjectAction } from '@braneframe/plugin-space';
import { CanvasType, SketchType } from '@braneframe/types';
import { parseIntentPlugin, type PluginDefinition, resolvePlugin } from '@dxos/app-framework';
import { EventSubscriptions } from '@dxos/async';
import { create } from '@dxos/echo-schema';
import { Filter, fullyQualifiedId } from '@dxos/react-client/echo';

import { SketchComponent, SketchMain } from './components';
import meta, { SKETCH_PLUGIN } from './meta';
import translations from './translations';
import { SketchAction, type SketchPluginProvides } from './types';

export const SketchPlugin = (): PluginDefinition<SketchPluginProvides> => {
  return {
    meta,
    provides: {
      metadata: {
        records: {
          [SketchType.typename]: {
            placeholder: ['object title placeholder', { ns: SKETCH_PLUGIN }],
            icon: (props: IconProps) => <CompassTool {...props} />,
          },
        },
      },
      translations,
      echo: {
        schema: [SketchType, CanvasType],
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
                  plugin: SKETCH_PLUGIN,
                  action: SketchAction.CREATE,
                  properties: {
                    label: ['create object label', { ns: SKETCH_PLUGIN }],
                    icon: (props: IconProps) => <CompassTool {...props} />,
                    testId: 'sketchPlugin.createObject',
                  },
                  dispatch,
                }),
              );
            });

            client.spaces
              .get()
              .filter((space) => !!enabled.find((key) => key.equals(space.key)))
              .forEach((space) => {
                // Add all sketches to the graph.
                const query = space.db.query(Filter.schema(SketchType));
                subscriptions.add(query.subscribe());
                let previousObjects: SketchType[] = [];
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
                            label: object.name || ['object title placeholder', { ns: SKETCH_PLUGIN }],
                            icon: (props: IconProps) => <CompassTool {...props} />,
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
            id: 'create-stack-section-sketch',
            testId: 'sketchPlugin.createSectionSpaceSketch',
            label: ['create stack section label', { ns: SKETCH_PLUGIN }],
            icon: (props: any) => <CompassTool {...props} />,
            intent: {
              plugin: SKETCH_PLUGIN,
              action: SketchAction.CREATE,
            },
          },
        ],
      },
      surface: {
        component: ({ data, role }) => {
          switch (role) {
            case 'main':
              return data.active instanceof SketchType ? <SketchMain sketch={data.active} /> : null;
            case 'slide':
              return data.slide instanceof SketchType ? (
                <SketchComponent sketch={data.slide} readonly autoZoom maxZoom={1.5} className='p-16' />
              ) : null;
            case 'article':
            case 'section':
              return data.object instanceof SketchType ? (
                <SketchComponent
                  sketch={data.object}
                  autoZoom={role === 'section'}
                  readonly={role === 'section'}
                  className={role === 'article' ? 'row-span-2' : 'bs-96'}
                />
              ) : null;
            default:
              return null;
          }
        },
      },
      intent: {
        resolver: (intent) => {
          switch (intent.action) {
            case SketchAction.CREATE: {
              return {
                data: create(SketchType, {
                  data: create(CanvasType, { content: '' }),
                }),
              };
            }
          }
        },
      },
    },
  };
};
