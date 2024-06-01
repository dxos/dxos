//
// Copyright 2023 DXOS.org
//

import { type IconProps, Presentation } from '@phosphor-icons/react';
import { batch, effect } from '@preact/signals-core';
import React from 'react';

import { parseClientPlugin } from '@braneframe/plugin-client';
import { DocumentType, Collection } from '@braneframe/types';
import {
  resolvePlugin,
  type PluginDefinition,
  parseIntentPlugin,
  LayoutAction,
  NavigationAction,
  parseNavigationPlugin,
  type Plugin,
  type LocationProvides,
} from '@dxos/app-framework';
import { EventSubscriptions } from '@dxos/async';
import { create } from '@dxos/echo-schema';
import { Filter, fullyQualifiedId } from '@dxos/react-client/echo';

import { PresenterMain, MarkdownSlide, RevealMain } from './components';
import meta, { PRESENTER_PLUGIN } from './meta';
import translations from './translations';
import { PresenterContext, TOGGLE_PRESENTATION, type PresenterPluginProvides } from './types';

// TODO(burdon): Only scale markdown content.
// TODO(burdon): Map stack content; Slide content type (e.g., markdown, sketch, IPFS image, table, etc.)

type PresenterState = {
  presenting: boolean;
};

export const PresenterPlugin = (): PluginDefinition<PresenterPluginProvides> => {
  // TODO(burdon): Do we need context providers if we can get the state from the plugin?
  const state = create<PresenterState>({ presenting: false });
  let navigationPlugin: Plugin<LocationProvides> | undefined;
  let isDeckModel = false;

  return {
    meta,
    ready: async (plugins) => {
      navigationPlugin = resolvePlugin(plugins, parseNavigationPlugin);
      isDeckModel = navigationPlugin?.meta.id === 'dxos.org/plugin/deck';
    },
    provides: {
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
              // Add all documents to the graph.
              const query = space.db.query(Filter.or(Filter.schema(Collection), Filter.schema(DocumentType)));
              subscriptions.add(query.subscribe());
              let previousObjects: Collection[] = [];
              subscriptions.add(
                effect(() => {
                  const removedObjects = previousObjects.filter((object) => !query.objects.includes(object));
                  previousObjects = query.objects;

                  batch(() => {
                    removedObjects.forEach((object) => {
                      graph.removeNode(`${TOGGLE_PRESENTATION}/${fullyQualifiedId(object)}`, true);
                    });
                    query.objects.forEach((object) => {
                      graph.addNodes({
                        id: `${TOGGLE_PRESENTATION}/${fullyQualifiedId(object)}`,
                        // TODO(burdon): Allow function so can generate state when activated.
                        //  So can set explicit fullscreen state coordinated with current presenter state.
                        data: () => {
                          return dispatch([
                            {
                              plugin: PRESENTER_PLUGIN,
                              action: TOGGLE_PRESENTATION,
                              data: { object },
                            },
                            ...(isDeckModel
                              ? [
                                  {
                                    action: NavigationAction.OPEN,
                                    data: { activeParts: { fullScreen: fullyQualifiedId(object) } },
                                  },
                                ]
                              : []),
                          ]);
                        },
                        properties: {
                          label: ['toggle presentation label', { ns: PRESENTER_PLUGIN }],
                          icon: (props: IconProps) => <Presentation {...props} />,
                          keyBinding: {
                            macos: 'shift+meta+p',
                            windows: 'shift+alt+p',
                          },
                        },
                        edges: [[fullyQualifiedId(object), 'inbound']],
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
      context: ({ children }) => {
        return (
          <PresenterContext.Provider
            value={{
              running: state.presenting,
              start: () => (state.presenting = true),
              stop: () => (state.presenting = false),
            }}
          >
            {children}
          </PresenterContext.Provider>
        );
      },
      surface: {
        component: ({ data, role }) => {
          switch (role) {
            case 'main': {
              if (state.presenting) {
                if (data.active instanceof Collection) {
                  return { node: <PresenterMain collection={data.active} />, disposition: 'hoist' };
                } else if (data.active instanceof DocumentType) {
                  return { node: <RevealMain document={data.active} />, disposition: 'hoist' };
                }
              }
              return null;
            }
            case 'slide':
              return data.slide instanceof DocumentType ? <MarkdownSlide document={data.slide} /> : null;
          }

          return null;
        },
      },
      intent: {
        resolver: (intent) => {
          switch (intent.action) {
            case TOGGLE_PRESENTATION: {
              state.presenting = intent.data?.state ?? !state.presenting;
              return {
                data: state.presenting,
                intents: [
                  [{ action: LayoutAction.SET_LAYOUT, data: { element: 'fullscreen', state: state.presenting } }],
                ],
              };
            }
          }
        },
      },
    },
  };
};
