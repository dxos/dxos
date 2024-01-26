//
// Copyright 2023 DXOS.org
//

import { Chat, type IconProps } from '@phosphor-icons/react';
import { effect } from '@preact/signals-react';
import { deepSignal } from 'deepsignal';
import React from 'react';

import { getActiveSpace, SPACE_PLUGIN, SpaceAction } from '@braneframe/plugin-space';
import { Folder, Thread as ThreadType } from '@braneframe/types';
import {
  LayoutAction,
  type GraphProvides,
  type IntentPluginProvides,
  type LayoutProvides,
  type Plugin,
  type PluginDefinition,
  parseIntentPlugin,
  parseLayoutPlugin,
  parseGraphPlugin,
  resolvePlugin,
} from '@dxos/app-framework';
import { LocalStorageStore } from '@dxos/local-storage';
import { type TypedObject, SpaceProxy, isTypedObject } from '@dxos/react-client/echo';
import { nonNullable } from '@dxos/util';

import { ChatContainer, CommentsSidebar, ThreadMain, ThreadSettings } from './components';
import meta, { THREAD_ITEM, THREAD_PLUGIN } from './meta';
import translations from './translations';
import { ThreadAction, type ThreadPluginProvides, isThread, type ThreadSettingsProps } from './types';

type ThreadState = {
  active?: string | undefined;
  threads?: { id: string; y: number }[];
  focus?: boolean;
};

export const ThreadPlugin = (): PluginDefinition<ThreadPluginProvides> => {
  let graphPlugin: Plugin<GraphProvides> | undefined;
  let layoutPlugin: Plugin<LayoutProvides> | undefined;
  let intentPlugin: Plugin<IntentPluginProvides> | undefined;

  const settings = new LocalStorageStore<ThreadSettingsProps>(THREAD_PLUGIN);
  const state = deepSignal<ThreadState>({});

  return {
    meta,
    ready: async (plugins) => {
      settings.prop(settings.values.$standalone!, 'standalone', LocalStorageStore.bool);

      graphPlugin = resolvePlugin(plugins, parseGraphPlugin);
      layoutPlugin = resolvePlugin(plugins, parseLayoutPlugin);
      intentPlugin = resolvePlugin(plugins, parseIntentPlugin)!;
    },
    provides: {
      settings: settings.values,
      metadata: {
        records: {
          [ThreadType.schema.typename]: {
            placeholder: ['thread title placeholder', { ns: THREAD_PLUGIN }],
            icon: (props: IconProps) => <Chat {...props} />,
          },
          [THREAD_ITEM]: {
            parse: (item: TypedObject, type: string) => {
              switch (type) {
                case 'node':
                  return { id: item.id, label: item.title, data: item };
                case 'object':
                  return item;
                case 'view-object':
                  return { id: `${item.id}-view`, object: item };
              }
            },
          },
        },
      },
      translations,
      graph: {
        builder: ({ parent, plugins }) => {
          if (!(parent.data instanceof Folder || parent.data instanceof SpaceProxy)) {
            return;
          }

          return effect(() => {
            if (settings.values.standalone) {
              parent.actionsMap[`${SPACE_PLUGIN}/create`]?.addAction({
                id: `${THREAD_PLUGIN}/create`,
                label: ['create thread label', { ns: THREAD_PLUGIN }],
                icon: (props) => <Chat {...props} />,
                invoke: () =>
                  intentPlugin?.provides.intent.dispatch([
                    {
                      plugin: THREAD_PLUGIN,
                      action: ThreadAction.CREATE,
                    },
                    {
                      action: SpaceAction.ADD_OBJECT,
                      data: { target: parent.data },
                    },
                    {
                      action: LayoutAction.ACTIVATE,
                    },
                  ]),
                properties: {
                  testId: 'threadPlugin.createObject',
                },
              });
            } else {
              parent.actionsMap[`${SPACE_PLUGIN}/create`]?.removeAction(`${THREAD_PLUGIN}/create`);
            }
          });
        },
      },
      surface: {
        component: ({ data, role }) => {
          switch (role) {
            case 'main': {
              return isThread(data.active) ? <ThreadMain thread={data.active} /> : null;
            }

            case 'settings': {
              return data.plugin === meta.id ? <ThreadSettings settings={settings.values} /> : null;
            }

            case 'context-thread': {
              const graph = graphPlugin?.provides.graph;
              const layout = layoutPlugin?.provides.layout;
              const space = layout?.active && getActiveSpace(graph!, layout.active);
              if (!space) {
                return null;
              }

              const active = layout?.active && space.db.getObjectById(layout.active);

              // TODO(burdon): Hack to detect comments.
              if ((active as any)?.comments?.length) {
                // Sort threads by y-position.
                // TODO(burdon): Should just use document position?
                // TODO(burdon): RTE if don't copy array!
                const threads = [...(state.threads ?? [])]
                  .sort((a, b) => a.y - b.y)
                  .map(({ id }) => space.db.getObjectById(id) as ThreadType)
                  .filter(nonNullable);

                return (
                  <CommentsSidebar
                    space={space}
                    threads={threads}
                    active={state.active}
                    focus={state.focus}
                    onFocus={(thread: ThreadType) => {
                      if (state.active !== thread.id) {
                        state.active = thread.id;
                        void intentPlugin?.provides.intent.dispatch({
                          action: LayoutAction.FOCUS,
                          data: {
                            object: thread.id,
                          },
                        });
                      }
                    }}
                  />
                );
              }

              // Don't show chat sidebar if a chat is active in the main layout.
              if (active) {
                if (isTypedObject(active) && active.__typename === ThreadType.schema.typename) {
                  return null;
                }
              }

              // Get the first non-comments thread.
              // TODO(burdon): Better way to do this (e.g., Hidden space-specific comments thread or per-object thread?)
              const { objects: threads } = space.db.query(ThreadType.filter((thread) => !thread.context));
              if (threads.length) {
                const thread = threads[0];
                return <ChatContainer space={space} thread={thread} activeObjectId={layout?.active} fullWidth={true} />;
              }

              break;
            }
          }

          return null;
        },
      },
      intent: {
        resolver: (intent) => {
          switch (intent.action) {
            case ThreadAction.CREATE: {
              return { data: new ThreadType() };
            }

            case ThreadAction.SELECT: {
              state.threads = intent.data?.threads;
              state.active = intent.data?.active;
              state.focus = intent.data?.focus;
              return { data: true };
            }
          }
        },
      },
    },
  };
};
