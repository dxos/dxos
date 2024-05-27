//
// Copyright 2023 DXOS.org
//

import { Brain, type IconProps } from '@phosphor-icons/react';
import { batch, effect } from '@preact/signals-core';
import React from 'react';

import { parseClientPlugin } from '@braneframe/plugin-client';
import { parseSpacePlugin } from '@braneframe/plugin-space';
import { DocumentType } from '@braneframe/types';
import {
  resolvePlugin,
  parseGraphPlugin,
  parseIntentPlugin,
  parseNavigationPlugin,
  type GraphProvides,
  type LocationProvides,
  type Plugin,
  type PluginDefinition,
  firstMainId,
} from '@dxos/app-framework';
import { EventSubscriptions } from '@dxos/async';
import { LocalStorageStore } from '@dxos/local-storage';
import { Filter, SpaceState, fullyQualifiedId, getSpace } from '@dxos/react-client/echo';

import { GptAnalyzer } from './analyzer';
import { GptSettings } from './components';
import meta, { GPT_PLUGIN } from './meta';
import translations from './translations';
import { GptAction, type GptPluginProvides, type GptSettingsProps } from './types';

export const GptPlugin = (): PluginDefinition<GptPluginProvides> => {
  const settings = new LocalStorageStore<GptSettingsProps>(GPT_PLUGIN, {});

  let graphPlugin: Plugin<GraphProvides> | undefined;
  let navigationPlugin: Plugin<LocationProvides> | undefined;

  return {
    meta,
    ready: async (plugins) => {
      settings.prop({ key: 'apiKey', storageKey: 'api-key', type: LocalStorageStore.string({ allowUndefined: true }) });

      graphPlugin = resolvePlugin(plugins, parseGraphPlugin);
      navigationPlugin = resolvePlugin(plugins, parseNavigationPlugin);
    },
    provides: {
      settings: settings.values,
      translations,
      graph: {
        // TODO(wittjosiah): Consider a builder which subscribes to the graph itself to add actions.
        builder: (plugins, graph) => {
          const client = resolvePlugin(plugins, parseClientPlugin)?.provides.client;
          const enabled = resolvePlugin(plugins, parseSpacePlugin)?.provides.space.enabled;
          const dispatch = resolvePlugin(plugins, parseIntentPlugin)?.provides.intent.dispatch;
          if (!client || !dispatch || !enabled) {
            return;
          }

          const subscriptions = new EventSubscriptions();
          const unsubscribe = effect(() => {
            client.spaces
              .get()
              .filter((space) => !!enabled.find((key) => key.equals(space.key)))
              .forEach((space) => {
                if (space.state.get() !== SpaceState.READY) {
                  return;
                }

                const query = space.db.query(Filter.schema(DocumentType));
                subscriptions.add(query.subscribe());
                let previousObjects: DocumentType[] = [];
                subscriptions.add(
                  effect(() => {
                    const removedObjects = previousObjects.filter((object) => !query.objects.includes(object));
                    previousObjects = query.objects;

                    batch(() => {
                      removedObjects.forEach((object) =>
                        graph.removeNode(`${GptAction.ANALYZE}/${fullyQualifiedId(object)}`, true),
                      );
                      query.objects.forEach((object) =>
                        graph.addNodes({
                          id: `${GptAction.ANALYZE}/${fullyQualifiedId(object)}`,
                          data: () =>
                            dispatch([
                              {
                                plugin: GPT_PLUGIN,
                                action: GptAction.ANALYZE,
                              },
                            ]),
                          properties: {
                            label: ['analyze document label', { ns: GPT_PLUGIN }],
                            icon: (props: IconProps) => <Brain {...props} />,
                          },
                        }),
                      );
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
            case 'settings':
              return data.plugin === meta.id ? <GptSettings settings={settings.values} /> : null;
          }

          return null;
        },
      },
      intent: {
        resolver: (intent) => {
          switch (intent.action) {
            case GptAction.ANALYZE: {
              // TODO(burdon): Factor out.
              const location = navigationPlugin?.provides.location;
              const graph = graphPlugin?.provides.graph;
              const activeNode = location?.active ? graph?.findNode(firstMainId(location.active)) : undefined;
              const active = activeNode?.data;
              const space = getSpace(active);
              if (space && active instanceof DocumentType && settings.values.apiKey) {
                // TODO(burdon): Toast on success.
                void new GptAnalyzer({ apiKey: settings.values.apiKey }).exec(space, active);
              }
            }
          }
        },
      },
    },
  };
};
