//
// Copyright 2023 DXOS.org
//

import { StackSimple, type IconProps } from '@phosphor-icons/react';
import { batch, effect } from '@preact/signals-core';
import React from 'react';

import { parseClientPlugin } from '@braneframe/plugin-client';
import { updateGraphWithAddObjectAction } from '@braneframe/plugin-space';
import { Stack as StackType } from '@braneframe/types';
import { resolvePlugin, type Plugin, type PluginDefinition, parseIntentPlugin } from '@dxos/app-framework';
import { EventSubscriptions } from '@dxos/async';
import * as E from '@dxos/echo-schema/schema';
import { LocalStorageStore } from '@dxos/local-storage';

import { StackMain, StackSettings, AddSectionDialog, dataHasAddSectionDialogProps } from './components';
import meta, { STACK_PLUGIN } from './meta';
import translations from './translations';
import {
  StackAction,
  isStack,
  type StackPluginProvides,
  type StackProvides,
  type StackState,
  type StackSettingsProps,
} from './types';

export const StackPlugin = (): PluginDefinition<StackPluginProvides> => {
  const settings = new LocalStorageStore<StackSettingsProps>(STACK_PLUGIN, { separation: true });
  const stackState = E.object<StackState>({ creators: [] });

  return {
    meta,
    ready: async (plugins) => {
      settings.prop({ key: 'separation', type: LocalStorageStore.bool() });

      for (const plugin of plugins) {
        if (plugin.meta.id === STACK_PLUGIN) {
          continue;
        }

        if (Array.isArray((plugin as Plugin<StackProvides>).provides?.stack?.creators)) {
          stackState.creators.push(...((plugin as Plugin<StackProvides>).provides.stack.creators ?? []));
        }
      }
    },
    provides: {
      settings: settings.values,
      metadata: {
        records: {
          [StackType.schema.typename]: {
            placeholder: ['stack title placeholder', { ns: STACK_PLUGIN }],
            icon: (props: IconProps) => <StackSimple {...props} />,
          },
          [StackType.Section.schema.typename]: {
            parse: (section: StackType.Section, type: string) => {
              switch (type) {
                case 'node':
                  return { id: section.object.id, label: section.object.title, data: section.object };
                case 'object':
                  return section.object;
                case 'view-object':
                  return section;
              }
            },
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
                  dispatch,
                  plugin: STACK_PLUGIN,
                  action: StackAction.CREATE,
                  properties: {
                    label: ['create stack label', { ns: STACK_PLUGIN }],
                    icon: (props: IconProps) => <StackSimple {...props} />,
                    testId: 'stackPlugin.createObject',
                  },
                }),
              );

              // Add all stacks to the graph.
              const query = space.db.query(StackType.filter());
              let previousObjects: StackType[] = [];
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
                          label: object.title || ['stack title placeholder', { ns: STACK_PLUGIN }],
                          icon: (props: IconProps) => <StackSimple {...props} />,
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
      surface: {
        component: ({ data, role }) => {
          switch (data.component) {
            case `${STACK_PLUGIN}/AddSectionDialog`:
              return dataHasAddSectionDialogProps(data) ? <AddSectionDialog {...data.subject} /> : null;
          }
          switch (role) {
            case 'main':
              return isStack(data.active) ? (
                <StackMain stack={data.active} separation={settings.values.separation} />
              ) : null;
            case 'settings': {
              return data.plugin === meta.id ? <StackSettings settings={settings.values} /> : null;
            }
            default:
              return null;
          }
        },
      },
      intent: {
        resolver: (intent) => {
          switch (intent.action) {
            case StackAction.CREATE: {
              return { data: new StackType() };
            }
          }
        },
      },
      stack: stackState,
    },
  };
};
