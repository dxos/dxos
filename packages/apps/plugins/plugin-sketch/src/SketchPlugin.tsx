//
// Copyright 2023 DXOS.org
//

import { CompassTool, type IconProps } from '@phosphor-icons/react';
import { batch, effect } from '@preact/signals-core';
import React from 'react';

import { parseClientPlugin } from '@braneframe/plugin-client';
import { updateGraphWithAddObjectAction } from '@braneframe/plugin-space';
import { Sketch as SketchType } from '@braneframe/types';
import { resolvePlugin, type PluginDefinition, parseIntentPlugin } from '@dxos/app-framework';
import { EventSubscriptions } from '@dxos/async';
import { Expando } from '@dxos/react-client/echo';

import { SketchMain, SketchComponent } from './components';
import meta, { SKETCH_PLUGIN } from './meta';
import translations from './translations';
import { SketchAction, type SketchPluginProvides, isSketch } from './types';

export const SketchPlugin = (): PluginDefinition<SketchPluginProvides> => {
  return {
    meta,
    provides: {
      metadata: {
        records: {
          [SketchType.schema.typename]: {
            placeholder: ['object title placeholder', { ns: SKETCH_PLUGIN }],
            icon: (props: IconProps) => <CompassTool {...props} />,
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

              // Add all sketches to the graph.
              const query = space.db.query(SketchType.filter());
              let previousObjects: SketchType[] = [];
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
                          label: object.title || ['object title placeholder', { ns: SKETCH_PLUGIN }],
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
            intent: [
              {
                plugin: SKETCH_PLUGIN,
                action: SketchAction.CREATE,
              },
              // TODO(burdon): Navigate directly (but return result to caller).
              // {
              //   action: NavigationAction.ACTIVATE,
              // },
            ],
          },
        ],
      },
      surface: {
        component: ({ data, role }) => {
          switch (role) {
            case 'main':
              return isSketch(data.active) ? <SketchMain sketch={data.active} /> : null;
            case 'slide':
              return isSketch(data.slide) ? (
                <SketchComponent sketch={data.slide} readonly={true} autoZoom={true} maxZoom={1.5} className={'p-16'} />
              ) : null;
            case 'section':
              return isSketch(data.object) ? (
                <SketchComponent sketch={data.object} readonly={true} autoZoom={true} className={'h-[400px]'} />
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
                data: new SketchType({
                  data: new Expando() as any,
                }),
              };
            }
          }
        },
      },
    },
  };
};
