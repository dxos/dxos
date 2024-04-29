//
// Copyright 2023 DXOS.org
//

import { type IconProps, Presentation } from '@phosphor-icons/react';
import { batch, effect } from '@preact/signals-core';
import React from 'react';

import { parseClientPlugin } from '@braneframe/plugin-client';
import { StackType, DocumentType } from '@braneframe/types';
import { resolvePlugin, type PluginDefinition, parseIntentPlugin, LayoutAction } from '@dxos/app-framework';
import { EventSubscriptions } from '@dxos/async';
import { create } from '@dxos/echo-schema';
import { Filter } from '@dxos/react-client/echo';

import { PresenterMain, MarkdownSlideMain } from './components';
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

  return {
    meta,
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
              const query = space.db.query(Filter.schema(StackType));
              subscriptions.add(query.subscribe());
              let previousObjects: StackType[] = [];
              subscriptions.add(
                effect(() => {
                  const removedObjects = previousObjects.filter((object) => !query.objects.includes(object));
                  previousObjects = query.objects;

                  batch(() => {
                    removedObjects.forEach((object) => {
                      graph.removeNode(`${TOGGLE_PRESENTATION}/${object.id}`, true);
                    });
                    query.objects.forEach((object) => {
                      graph.addNodes({
                        id: `${TOGGLE_PRESENTATION}/${object.id}`,
                        // TODO(burdon): Allow function so can generate state when activated.
                        //  So can set explicit fullscreen state coordinated with current presenter state.
                        data: () =>
                          dispatch({
                            plugin: PRESENTER_PLUGIN,
                            action: TOGGLE_PRESENTATION,
                          }),
                        properties: {
                          label: ['toggle presentation label', { ns: PRESENTER_PLUGIN }],
                          icon: (props: IconProps) => <Presentation {...props} />,
                          keyBinding: {
                            macos: 'shift+meta+p',
                            windows: 'shift+alt+p',
                          },
                        },
                        edges: [[object.id, 'inbound']],
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
            case 'main':
              return data.active instanceof StackType && state.presenting
                ? { node: <PresenterMain stack={data.active} />, disposition: 'hoist' }
                : null;
            case 'slide':
              return data.slide instanceof DocumentType ? <MarkdownSlideMain document={data.slide} /> : null;
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
