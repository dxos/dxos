//
// Copyright 2023 DXOS.org
//

import { Chat, type IconProps } from '@phosphor-icons/react';
import { batch, effect, untracked } from '@preact/signals-core';
import React from 'react';

import { parseClientPlugin } from '@braneframe/plugin-client';
import { parseSpacePlugin, updateGraphWithAddObjectAction } from '@braneframe/plugin-space';
import { ThreadType, DocumentType, MessageType } from '@braneframe/types';
import {
  type IntentPluginProvides,
  LayoutAction,
  NavigationAction,
  type LocationProvides,
  type Plugin,
  type PluginDefinition,
  parseIntentPlugin,
  parseNavigationPlugin,
  resolvePlugin,
  parseGraphPlugin,
  firstMainId,
  SLUG_PATH_SEPARATOR,
  SLUG_COLLECTION_INDICATOR,
  isActiveParts,
} from '@dxos/app-framework';
import { EventSubscriptions, type UnsubscribeCallback } from '@dxos/async';
import { type EchoReactiveObject } from '@dxos/echo-schema';
import { create } from '@dxos/echo-schema';
import { LocalStorageStore } from '@dxos/local-storage';
import {
  getSpace,
  getTextInRange,
  Filter,
  isSpace,
  createDocAccessor,
  fullyQualifiedId,
} from '@dxos/react-client/echo';
import { ScrollArea } from '@dxos/react-ui';
import { useAttendable } from '@dxos/react-ui-deck';
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
  ThreadArticle,
} from './components';
import meta, { THREAD_ITEM, THREAD_PLUGIN } from './meta';
import translations from './translations';
import { ThreadAction, type ThreadPluginProvides, type ThreadSettingsProps } from './types';

type ThreadState = {
  threads: Record<string, number>;
  current?: string | undefined;
  focus?: boolean;
};

// TODO(thure): Get source of truth from `react-ui-theme`.
const isMinSm = () => window.matchMedia('(min-width:768px)').matches;

export const ThreadPlugin = (): PluginDefinition<ThreadPluginProvides> => {
  const settings = new LocalStorageStore<ThreadSettingsProps>(THREAD_PLUGIN);
  const state = create<ThreadState>({ threads: {} });

  let navigationPlugin: Plugin<LocationProvides> | undefined;
  let isDeckModel = false;
  let intentPlugin: Plugin<IntentPluginProvides> | undefined;
  let unsubscribe: UnsubscribeCallback | undefined;
  let queryUnsubscribe: UnsubscribeCallback | undefined;

  return {
    meta,
    ready: async (plugins) => {
      settings.prop({ key: 'standalone', type: LocalStorageStore.bool({ allowUndefined: true }) });

      navigationPlugin = resolvePlugin(plugins, parseNavigationPlugin);
      isDeckModel = navigationPlugin?.meta.id === 'dxos.org/plugin/deck';
      intentPlugin = resolvePlugin(plugins, parseIntentPlugin)!;
      const graphPlugin = resolvePlugin(plugins, parseGraphPlugin);
      const client = resolvePlugin(plugins, parseClientPlugin)?.provides.client;
      if (!client) {
        return;
      }

      // TODO(wittjosiah): This is a hack to make standalone threads work in the c11y sidebar.
      //  This should have a better solution when deck is introduced.
      const threadsQuery = client.spaces.query(Filter.schema(ThreadType, (thread) => !thread.context));
      queryUnsubscribe = threadsQuery.subscribe();
      unsubscribe = isDeckModel
        ? effect(() => {
            const firstAttendedNodeWithComments = (
              Array.from(navigationPlugin?.provides.attention?.attended ?? new Set<string>()) as string[]
            )
              .map((id) => graphPlugin?.provides.graph.findNode(id))
              .filter(
                (maybeNode) =>
                  maybeNode && maybeNode?.data instanceof DocumentType && (maybeNode.data.comments?.length ?? 0) > 0,
              )[0];
            if (firstAttendedNodeWithComments) {
              void intentPlugin?.provides.intent.dispatch({
                action: NavigationAction.OPEN,
                data: {
                  activeParts: {
                    complementary: `${firstAttendedNodeWithComments.id}${SLUG_PATH_SEPARATOR}comments${SLUG_COLLECTION_INDICATOR}`,
                  },
                },
              });
            }
          })
        : effect(() => {
            const active = firstMainId(navigationPlugin?.provides.location.active);
            const activeNode = active ? graphPlugin?.provides.graph.findNode(active) : undefined;
            const space = activeNode
              ? isSpace(activeNode.data)
                ? activeNode.data
                : getSpace(activeNode.data)
              : undefined;
            untracked(() => {
              const [thread] = threadsQuery.objects.filter((thread) => getSpace(thread) === space);
              if (
                activeNode &&
                activeNode?.data instanceof DocumentType &&
                (activeNode.data.comments?.length ?? 0) > 0
              ) {
                void intentPlugin?.provides.intent.dispatch({
                  action: LayoutAction.SET_LAYOUT,
                  data: {
                    element: 'complementary',
                    subject: activeNode.data,
                    state: isMinSm(),
                  },
                });
              } else if (settings.values.standalone && thread && !(activeNode?.data instanceof ThreadType)) {
                void intentPlugin?.provides.intent.dispatch({
                  action: LayoutAction.SET_LAYOUT,
                  data: {
                    element: 'complementary',
                    subject: thread,
                    state: isMinSm(),
                  },
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
      queryUnsubscribe?.();
    },
    provides: {
      settings: settings.values,
      metadata: {
        records: {
          [ThreadType.typename]: {
            placeholder: ['thread title placeholder', { ns: THREAD_PLUGIN }],
            icon: (props: IconProps) => <Chat {...props} />,
          },
          [THREAD_ITEM]: {
            parse: (item: EchoReactiveObject<any>, type: string) => {
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
      echo: {
        schema: [ThreadType, MessageType],
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
                  plugin: THREAD_PLUGIN,
                  action: ThreadAction.CREATE,
                  properties: {
                    label: ['create thread label', { ns: THREAD_PLUGIN }],
                    icon: (props: IconProps) => <Chat {...props} />,
                    testId: 'threadPlugin.createObject',
                  },
                  condition: Boolean(settings.values.standalone),
                  dispatch,
                }),
              );
            });

            client.spaces
              .get()
              .filter((space) => !!enabled.find((id) => id === space.id))
              .forEach((space) => {
                // Add all threads not linked to documents to the graph.
                const query = space.db.query(Filter.schema(ThreadType));
                subscriptions.add(query.subscribe());
                // TODO(wittjosiah): There should be a better way to do this.
                //  Resolvers in echo schema is likely the solution.
                const documentQuery = space.db.query(Filter.schema(DocumentType));
                subscriptions.add(documentQuery.subscribe());
                let previousObjects: ThreadType[] = [];
                subscriptions.add(
                  effect(() => {
                    const documentThreads = documentQuery.objects
                      .flatMap((doc) => doc.comments?.map((comment) => comment.thread?.id))
                      .filter(nonNullable);
                    const objects = query.objects.filter((thread) => !documentThreads.includes(thread.id));
                    const removedObjects = previousObjects.filter((object) => !objects.includes(object));
                    previousObjects = objects;

                    batch(() => {
                      removedObjects.forEach((object) => graph.removeNode(fullyQualifiedId(object)));
                      objects.forEach((object) => {
                        graph.addNodes({
                          id: fullyQualifiedId(object),
                          data: object,
                          properties: {
                            // TODO(wittjosiah): Reconcile with metadata provides.
                            label: object.title || ['thread title placeholder', { ns: THREAD_PLUGIN }],
                            icon: (props: IconProps) => <Chat {...props} />,
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
      surface: {
        component: ({ data, role }) => {
          switch (role) {
            case 'main': {
              return data.active instanceof ThreadType ? <ThreadMain thread={data.active} /> : null;
            }

            case 'settings': {
              return data.plugin === meta.id ? <ThreadSettings settings={settings.values} /> : null;
            }

            case 'article':
            case 'complementary': {
              const dispatch = intentPlugin?.provides.intent.dispatch;
              const location = navigationPlugin?.provides.location;

              if (data.object instanceof ThreadType) {
                // TODO(Zan): Maybe we should have utility for positional main object ids.
                if (isActiveParts(location?.active) && Array.isArray(location.active.main)) {
                  const objectIdParts = location.active.main
                    .map((qualifiedId) => {
                      try {
                        return qualifiedId.split(':')[1];
                      } catch {
                        return undefined;
                      }
                    })
                    .filter(nonNullable);

                  const currentPosition = objectIdParts.indexOf(data.object.id);

                  if (currentPosition > 0) {
                    const objectToTheLeft = objectIdParts[currentPosition - 1];
                    return <ThreadArticle thread={data.object} context={{ object: objectToTheLeft }} />;
                  }
                }

                return <ThreadArticle thread={data.object} />;
              }

              // TODO(burdon): Hack to detect comments.
              if (data.subject instanceof DocumentType) {
                const comments = data.subject.comments;
                // Sort threads by y-position.
                // TODO(burdon): Should just use document position?
                const threads = comments
                  ?.map(({ thread }) => thread)
                  .filter((thread): thread is ThreadType => thread instanceof ThreadType)
                  .toSorted((a, b) => state.threads[a.id] - state.threads[b.id]);

                const detached = comments
                  ?.filter(({ cursor }) => !cursor)
                  .map(({ thread }) => thread?.id)
                  .filter(nonNullable);

                const attention =
                  navigationPlugin?.provides.attention?.attended ?? new Set([fullyQualifiedId(data.subject)]);
                const attendableAttrs = useAttendable(fullyQualifiedId(data.subject));

                return (
                  <div role='none' className='contents group/attention' {...attendableAttrs}>
                    {role === 'complementary' && <CommentsHeading attendableId={fullyQualifiedId(data.subject)} />}
                    <ScrollArea.Root classNames='row-span-2'>
                      <ScrollArea.Viewport>
                        <CommentsContainer
                          threads={threads ?? []}
                          detached={detached ?? []}
                          currentId={attention.has(fullyQualifiedId(data.subject)) ? state.current : undefined}
                          context={{ object: firstMainId(location?.active) }}
                          autoFocusCurrentTextbox={state.focus}
                          onThreadAttend={(thread: ThreadType) => {
                            if (state.current !== thread.id) {
                              state.current = thread.id;
                              void dispatch?.({
                                action: LayoutAction.SCROLL_INTO_VIEW,
                                data: { id: thread.id },
                              });
                            }
                          }}
                          onThreadDelete={(thread: ThreadType) =>
                            dispatch?.({
                              plugin: THREAD_PLUGIN,
                              action: ThreadAction.DELETE,
                              data: { document: data.subject, thread },
                            })
                          }
                        />
                        <div role='none' className='bs-10' />
                        <ScrollArea.Scrollbar>
                          <ScrollArea.Thumb />
                        </ScrollArea.Scrollbar>
                      </ScrollArea.Viewport>
                    </ScrollArea.Root>
                  </div>
                );
              } else if (data.subject instanceof ThreadType) {
                return (
                  <>
                    <ChatHeading attendableId={data.subject.id} />
                    <ChatContainer thread={data.subject} context={{ object: firstMainId(location?.active) }} />
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
              return { data: create(ThreadType, { messages: [] }) };
            }

            case ThreadAction.SELECT: {
              state.threads = { ...state.threads, ...intent.data?.threads };
              state.focus = intent.data?.current === state.current ? state.focus : intent.data?.focus;
              state.current = intent.data?.current;
              return { data: true };
            }

            case ThreadAction.DELETE: {
              const { document: doc, thread, cursor } = intent.data ?? {};
              const space = getSpace(thread);
              if (!(doc instanceof DocumentType) || !doc.comments || !(thread instanceof ThreadType) || !space) {
                return;
              }

              if (!intent.undo) {
                const index = doc.comments.findIndex((comment) => comment.thread?.id === thread.id);
                const cursor = doc.comments[index]?.cursor;
                if (index !== -1) {
                  doc.comments?.splice(index, 1);
                }

                space.db.remove(thread);

                return {
                  undoable: {
                    message: translations[0]['en-US'][THREAD_PLUGIN]['thread deleted label'],
                    data: { cursor },
                  },
                };
              } else if (intent.undo && typeof cursor === 'string') {
                // TODO(wittjosiah): SDK should do this automatically.
                const savedThread = space.db.add(thread);
                doc.comments.push({ thread: savedThread, cursor });
                return { data: true };
              }
            }
          }
        },
      },
      markdown: {
        // TODO(burdon): Factor out extension factory into separate file (for simplicity).
        extensions: ({ document: doc }) => {
          const space = doc && getSpace(doc);
          if (!doc || !space) {
            return [];
          }

          return [
            listener({
              onChange: () => {
                doc.comments?.forEach(({ thread, cursor }) => {
                  if (thread instanceof ThreadType && cursor) {
                    const [start, end] = cursor.split(':');
                    const title =
                      doc.content && getTextInRange(createDocAccessor(doc.content, ['content']), start, end);
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
              id: doc.id,
              onCreate: ({ cursor, location }) => {
                // Create comment thread.
                const [start, end] = cursor.split(':');
                const title = doc.content && getTextInRange(createDocAccessor(doc.content, ['content']), start, end);
                const thread = space.db.add(create(ThreadType, { title, messages: [], context: { object: doc.id } }));
                if (doc.comments) {
                  doc.comments.push({ thread, cursor });
                } else {
                  doc.comments = [{ thread, cursor }];
                }
                void intentPlugin?.provides.intent.dispatch([
                  ...(isDeckModel
                    ? [
                        {
                          action: NavigationAction.OPEN,
                          data: {
                            activeParts: {
                              complementary: `${doc.id}${SLUG_PATH_SEPARATOR}comments${SLUG_COLLECTION_INDICATOR}`,
                            },
                          },
                        },
                      ]
                    : []),
                  {
                    action: ThreadAction.SELECT,
                    data: { current: thread.id, threads: { [thread.id]: location?.top }, focus: true },
                  },
                  {
                    action: LayoutAction.SET_LAYOUT,
                    data: {
                      element: 'complementary',
                      subject: doc,
                      state: true,
                    },
                  },
                ]);

                return thread.id;
              },
              onDelete: ({ id }) => {
                const comment = doc.comments?.find(({ thread }) => thread?.id === id);
                if (comment) {
                  comment.cursor = undefined;
                }
              },
              onUpdate: ({ id, cursor }) => {
                const comment = doc.comments?.find(({ thread }) => thread?.id === id);
                if (comment && comment.thread instanceof ThreadType) {
                  const [start, end] = cursor.split(':');
                  comment.thread.title =
                    doc.content && getTextInRange(createDocAccessor(doc.content, ['content']), start, end);
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
