//
// Copyright 2023 DXOS.org
//

import { Chat, type IconProps } from '@phosphor-icons/react';
import { effect, untracked } from '@preact/signals-core';
import { deepSignal } from 'deepsignal/react';
import React from 'react';

import { isDocument } from '@braneframe/plugin-markdown';
import { SPACE_PLUGIN, SpaceAction } from '@braneframe/plugin-space';
import { Folder, Thread as ThreadType } from '@braneframe/types';
import {
  type IntentPluginProvides,
  LayoutAction,
  type LocationProvides,
  NavigationAction,
  type Plugin,
  type PluginDefinition,
  parseIntentPlugin,
  parseNavigationPlugin,
  resolvePlugin,
  parseGraphPlugin,
} from '@dxos/app-framework';
import { type UnsubscribeCallback } from '@dxos/async';
import { LocalStorageStore } from '@dxos/local-storage';
import { SpaceProxy, type TypedObject, getSpaceForObject, getTextInRange } from '@dxos/react-client/echo';
import { ScrollArea } from '@dxos/react-ui';
import { comments, listener } from '@dxos/react-ui-editor';
import { translations as threadTranslations } from '@dxos/react-ui-thread';
import { nonNullable } from '@dxos/util';

import {
  ThreadMain,
  ThreadSettings,
  CommentsContainer,
  CommentsHeading,
  ChatContainer,
  ChatHeading,
} from './components';
import meta, { THREAD_ITEM, THREAD_PLUGIN } from './meta';
import translations from './translations';
import { ThreadAction, type ThreadPluginProvides, isThread, type ThreadSettingsProps } from './types';

type ThreadState = {
  threads: Record<string, number>;
  current?: string | undefined;
  focus?: boolean;
};

export const ThreadPlugin = (): PluginDefinition<ThreadPluginProvides> => {
  const settings = new LocalStorageStore<ThreadSettingsProps>(THREAD_PLUGIN);
  const state = deepSignal<ThreadState>({ threads: {} });

  let navigationPlugin: Plugin<LocationProvides> | undefined;
  let intentPlugin: Plugin<IntentPluginProvides> | undefined;
  let unsubscribe: UnsubscribeCallback | undefined;

  return {
    meta,
    ready: async (plugins) => {
      settings.prop(settings.values.$standalone!, 'standalone', LocalStorageStore.bool);
      navigationPlugin = resolvePlugin(plugins, parseNavigationPlugin);
      intentPlugin = resolvePlugin(plugins, parseIntentPlugin)!;
      const graphPlugin = resolvePlugin(plugins, parseGraphPlugin);

      // TODO(wittjosiah): This is a hack to make standalone threads work in the c11y sidebar.
      //  This should have a better solution when deck is introduced.
      unsubscribe = effect(() => {
        const active = navigationPlugin?.provides.location.active;
        const activeNode = active ? graphPlugin?.provides.graph.findNode(active) : undefined;
        const space = activeNode
          ? activeNode.data instanceof SpaceProxy
            ? activeNode.data
            : getSpaceForObject(activeNode.data)
          : undefined;
        untracked(() => {
          const [thread] = space?.db.query(ThreadType.filter((thread) => !thread.context)).objects ?? [];
          if (activeNode && isDocument(activeNode?.data) && activeNode.data.comments.length > 0) {
            void intentPlugin?.provides.intent.dispatch({
              action: LayoutAction.SET_LAYOUT,
              data: { element: 'complementary', subject: activeNode.data, state: true },
            });
          } else if (settings.values.standalone && thread && !isThread(activeNode?.data)) {
            void intentPlugin?.provides.intent.dispatch({
              action: LayoutAction.SET_LAYOUT,
              data: { element: 'complementary', subject: thread, state: true },
            });
          } else {
            void intentPlugin?.provides.intent.dispatch({
              action: LayoutAction.SET_LAYOUT,
              data: { element: 'complementary', subject: null, state: false },
            });
          }
        });
      });
    },
    unload: async () => {
      unsubscribe?.();
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
        builder: ({ parent }) => {
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
                      action: NavigationAction.ACTIVATE,
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

            case 'complementary': {
              const dispatch = intentPlugin?.provides.intent.dispatch;
              const location = navigationPlugin?.provides.location;

              // TODO(burdon): Hack to detect comments.
              if (isDocument(data.subject)) {
                const comments = data.subject.comments;
                // Sort threads by y-position.
                // TODO(burdon): Should just use document position?
                const threads = comments
                  .map(({ thread }) => thread)
                  .filter(nonNullable)
                  .toSorted((a, b) => state.threads[a.id] - state.threads[b.id]);

                const detached = comments
                  .filter(({ cursor }) => !cursor)
                  .map(({ thread }) => thread?.id)
                  .filter(nonNullable);

                return (
                  <>
                    <CommentsHeading />
                    <ScrollArea.Root>
                      <ScrollArea.Viewport>
                        <CommentsContainer
                          threads={threads}
                          detached={detached}
                          currentId={state.current}
                          context={{ object: location?.active }}
                          autoFocusCurrentTextbox={state.focus}
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
                          onThreadDelete={(thread: ThreadType) =>
                            dispatch?.({
                              plugin: THREAD_PLUGIN,
                              action: ThreadAction.DELETE,
                              data: { document, thread },
                            })
                          }
                        />
                        <div role='none' className='bs-10' />
                        <ScrollArea.Scrollbar>
                          <ScrollArea.Thumb />
                        </ScrollArea.Scrollbar>
                      </ScrollArea.Viewport>
                    </ScrollArea.Root>
                  </>
                );
              } else if (isThread(data.subject)) {
                return (
                  <>
                    <ChatHeading />
                    <ChatContainer thread={data.subject} context={{ object: location?.active }} />
                  </>
                );
              }
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
              state.focus = intent.data?.current === state.current ? state.focus : intent.data?.focus;
              state.current = intent.data?.current;
              return { data: true };
            }

            case ThreadAction.DELETE: {
              const { document: doc, thread, cursor } = intent.data ?? {};
              if (!isDocument(doc) || !isThread(thread)) {
                return;
              }

              if (!intent.undo) {
                const index = doc.comments.findIndex((comment) => comment.thread?.id === thread.id);
                const cursor = doc.comments[index]?.cursor;
                if (index !== -1) {
                  doc.comments.splice(index, 1);
                }

                return {
                  undoable: {
                    message: translations[0]['en-US'][THREAD_PLUGIN]['thread deleted label'],
                    data: { cursor },
                  },
                };
              } else if (intent.undo && typeof cursor === 'string') {
                doc.comments.push({ thread, cursor });
                return { data: true };
              }
            }
          }
        },
      },
      markdown: {
        // TODO(burdon): Factor out extension factory into separate file (for simplicity).
        extensions: ({ document: doc }) => {
          const space = doc && getSpaceForObject(doc);
          if (!doc || !space) {
            return [];
          }

          return [
            listener({
              onChange: () => {
                doc.comments.forEach(({ thread, cursor }) => {
                  if (thread && cursor) {
                    const [start, end] = cursor.split(':');
                    const title = getTextInRange(doc.content, start, end);
                    // TODO(burdon): This seems unsafe; review.
                    // Only update if the title has changed, otherwise this will cause an infinite loop.
                    // Skip if the title is empty - this means comment text was deleted, but thread title should remain.
                    if (title && title !== thread.title) {
                      thread.title = title;
                    }
                  }
                });
              },
            }),
            comments({
              id: doc.content?.id,
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
                    action: LayoutAction.SET_LAYOUT,
                    data: { element: 'complementary', subject: doc, state: true },
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
