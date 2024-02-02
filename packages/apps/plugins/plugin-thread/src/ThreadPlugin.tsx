//
// Copyright 2023 DXOS.org
//

import { Chat, type IconProps } from '@phosphor-icons/react';
import { effect } from '@preact/signals-react';
import { deepSignal } from 'deepsignal';
import React from 'react';

import { isDocument } from '@braneframe/plugin-markdown';
import { SPACE_PLUGIN, SpaceAction } from '@braneframe/plugin-space';
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
import {
  type TypedObject,
  SpaceProxy,
  isTypedObject,
  getSpaceForObject,
  getTextInRange,
} from '@dxos/react-client/echo';
import { comments, listener } from '@dxos/react-ui-editor';
import { translations as threadTranslations } from '@dxos/react-ui-thread';
import { nonNullable } from '@dxos/util';

import { ThreadContainer, ThreadMain, ThreadSettings, ThreadsContainer } from './components';
import meta, { THREAD_ITEM, THREAD_PLUGIN } from './meta';
import translations from './translations';
import { ThreadAction, type ThreadPluginProvides, isThread, type ThreadSettingsProps } from './types';

type ThreadState = {
  threads: Record<string, number>;
  current?: string | undefined;
  focus?: boolean;
};

export const ThreadPlugin = (): PluginDefinition<ThreadPluginProvides> => {
  let graphPlugin: Plugin<GraphProvides> | undefined;
  let layoutPlugin: Plugin<LayoutProvides> | undefined;
  let intentPlugin: Plugin<IntentPluginProvides> | undefined;

  const settings = new LocalStorageStore<ThreadSettingsProps>(THREAD_PLUGIN);
  const state = deepSignal<ThreadState>({ threads: {} });

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
      translations: [...translations, ...threadTranslations],
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
              const activeNode = layout?.active ? graph?.findNode(layout.active) : undefined;
              const active = activeNode?.data;
              const space = isDocument(active) && getSpaceForObject(active);
              if (!space) {
                return null;
              }

              // TODO(burdon): Hack to detect comments.
              if ((active as any)?.comments?.length) {
                // Sort threads by y-position.
                // TODO(burdon): Should just use document position?
                const threads = active.comments
                  .map(({ thread }) => thread)
                  .filter(nonNullable)
                  .toSorted((a, b) => state.threads[a.id] - state.threads[b.id]);

                const detached = active.comments
                  .filter(({ cursor }) => !cursor)
                  .map(({ thread }) => thread?.id)
                  .filter(nonNullable);

                return (
                  <ThreadsContainer
                    space={space}
                    threads={threads}
                    detached={detached}
                    currentId={state.current}
                    autoFocusCurrentTextbox={state.focus}
                    currentRelatedId={layout?.active}
                    onThreadAttend={(thread: ThreadType) => {
                      if (state.current !== thread.id) {
                        state.current = thread.id;
                        void intentPlugin?.provides.intent.dispatch({
                          action: LayoutAction.FOCUS,
                          data: {
                            object: thread.id,
                          },
                        });
                      }
                    }}
                    onThreadDelete={(thread: ThreadType) => {
                      const index = active.comments.findIndex((comment) => comment.thread?.id === thread.id);
                      if (index !== -1) {
                        active.comments.splice(index, 1);
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
                return <ThreadContainer space={space} thread={thread} currentRelatedId={layout?.active} />;
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
              state.threads = { ...state.threads, ...intent.data?.threads };
              state.current = intent.data?.current;
              state.focus = intent.data?.focus;
              return { data: true };
            }
          }
        },
      },
      markdown: {
        extensions: ({ document: doc }) => {
          const space = doc && getSpaceForObject(doc);
          if (!doc || !space) {
            return [];
          }

          return [
            listener({
              onChange: () => {
                document.comments.forEach(({ thread, cursor }) => {
                  if (thread && cursor) {
                    const [start, end] = cursor.split(':');
                    const title = getTextInRange(document.content, start, end);
                    // Only update if the title has changed, otherwise this will cause an infinite loop.
                    if (title !== thread.title) {
                      thread.title = title;
                    }
                  }
                });
              },
            }),
            comments({
              onCreate: ({ cursor, location }) => {
                // Create comment thread.
                const [start, end] = cursor.split(':');
                const title = getTextInRange(doc.content, start, end);
                const thread = space.db.add(new ThreadType({ title, context: { object: doc.id } }));
                doc.comments.push({ thread, cursor });
                void intentPlugin?.provides.intent.dispatch([
                  {
                    action: ThreadAction.SELECT,
                    data: { current: thread.id, threads: { [thread.id]: location?.top }, focus: true },
                  },
                  {
                    action: LayoutAction.TOGGLE_COMPLEMENTARY_SIDEBAR,
                    data: { state: true },
                  },
                ]);

                return thread.id;
              },
              onDelete: ({ id }) => {
                const comment = doc.comments.find(({ thread }) => thread?.id === id);
                if (comment) {
                  comment.cursor = undefined;
                }
              },
              onUpdate: ({ id, cursor }) => {
                const comment = doc.comments.find(({ thread }) => thread?.id === id);
                if (comment && comment.thread) {
                  const [start, end] = cursor.split(':');
                  comment.thread.title = getTextInRange(doc.content, start, end);
                  comment.cursor = cursor;
                }
              },
              onSelect: (state) => {
                const {
                  comments,
                  selection: { current, closest },
                } = state;

                const threads = comments
                  ? comments.reduce(
                      (threads, { comment: { id }, location }) => ({
                        ...threads,
                        [id]: location?.top,
                      }),
                      {},
                    )
                  : {};

                void intentPlugin?.provides.intent.dispatch([
                  {
                    action: ThreadAction.SELECT,
                    data: {
                      current: current ?? closest,
                      threads,
                    },
                  },
                ]);
              },
            }),
          ];
        },
      },
    },
  };
};
