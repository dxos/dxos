//
// Copyright 2023 DXOS.org
//

import { CompassTool, type IconProps } from '@phosphor-icons/react';
import { batch, effect } from '@preact/signals-core';
import React from 'react';

import { parseClientPlugin } from '@braneframe/plugin-client';
import { parseSpacePlugin, updateGraphWithAddObjectAction } from '@braneframe/plugin-space';
import { CanvasType, DiagramType, TLDRAW_SCHEMA } from '@braneframe/types';
import { parseIntentPlugin, type PluginDefinition, resolvePlugin } from '@dxos/app-framework';
import { EventSubscriptions } from '@dxos/async';
import { create } from '@dxos/echo-schema';
import { LocalStorageStore } from '@dxos/local-storage';
import { Filter, fullyQualifiedId } from '@dxos/react-client/echo';

import { SketchComponent, SketchMain, SketchSettings } from './components';
import meta, { SKETCH_PLUGIN } from './meta';
import translations from './translations';
import { SketchAction, type SketchGridType, type SketchPluginProvides, type SketchSettingsProps } from './types';

export const SketchPlugin = (): PluginDefinition<SketchPluginProvides> => {
  const settings = new LocalStorageStore<SketchSettingsProps>(SKETCH_PLUGIN, {});

  return {
    meta,
    ready: async () => {
      settings
        .prop({
          key: 'autoHideControls',
          storageKey: 'auto-hide-controls',
          type: LocalStorageStore.bool({ allowUndefined: true }),
        })
        .prop({
          key: 'gridType',
          storageKey: 'grid-type',
          type: LocalStorageStore.enum<SketchGridType>({ allowUndefined: true }),
        });
    },
    provides: {
      metadata: {
        records: {
          [DiagramType.typename]: {
            placeholder: ['object title placeholder', { ns: SKETCH_PLUGIN }],
            icon: (props: IconProps) => <CompassTool {...props} />,
          },
        },
      },
      settings: settings.values,
      translations,
      echo: {
        schema: [DiagramType, CanvasType],
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
              .filter((space) => !!enabled.find((id) => id === space.id))
              .forEach((space) => {
                // Add all sketches to the graph.
                const query = space.db.query(Filter.schema(DiagramType));
                subscriptions.add(query.subscribe());
                let previousObjects: DiagramType[] = [];
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
      stack: {
        creators: [
          {
            id: 'create-stack-section-sketch',
            testId: 'sketchPlugin.createSectionSpaceSketch',
            label: ['create stack section label', { ns: SKETCH_PLUGIN }],
            icon: (props: any) => <CompassTool {...props} />,
            intent: [
              {
                plugin: SKETCH_PLUGIN,
                action: SketchAction.CREATE,
              },
            ],
          },
        ],
      },
      surface: {
        component: ({ data, role }) => {
          switch (role) {
            case 'main':
              return data.active instanceof DiagramType ? (
                <SketchMain
                  sketch={data.active}
                  autoHideControls={settings.values.autoHideControls}
                  grid={settings.values.gridType}
                />
              ) : null;
            case 'slide':
              return data.slide instanceof DiagramType ? (
                <SketchComponent
                  sketch={data.slide}
                  readonly
                  autoZoom
                  maxZoom={1.5}
                  className='p-16'
                  autoHideControls={settings.values.autoHideControls}
                  grid={settings.values.gridType}
                />
              ) : null;
            case 'article':
            case 'section':
              // NOTE: Min 500px height (for tools palette).
              return data.object instanceof DiagramType ? (
                <SketchComponent
                  sketch={data.object}
                  autoZoom={role === 'section'}
                  className={role === 'article' ? 'row-span-2' : 'bs-[540px]'}
                  autoHideControls={settings.values.autoHideControls}
                  grid={settings.values.gridType}
                />
              ) : null;
            case 'settings': {
              return data.plugin === meta.id ? <SketchSettings settings={settings.values} /> : null;
            }
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
                data: create(DiagramType, {
                  canvas: create(CanvasType, { schema: TLDRAW_SCHEMA, content: {} }),
                }),
              };
            }
          }
        },
      },
    },
  };
};
