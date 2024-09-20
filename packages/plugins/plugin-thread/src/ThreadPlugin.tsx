//
// Copyright 2023 DXOS.org
//

import { Chat, type IconProps } from '@phosphor-icons/react';
import { computed, effect } from '@preact/signals-core';
import React, { useCallback } from 'react';

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
  SLUG_PATH_SEPARATOR,
  SLUG_COLLECTION_INDICATOR,
  isLayoutParts,
  parseMetadataResolverPlugin,
  type IntentDispatcher,
  useResolvePlugins,
} from '@dxos/app-framework';
import { type UnsubscribeCallback } from '@dxos/async';
import { type EchoReactiveObject, getTypename } from '@dxos/echo-schema';
import { create } from '@dxos/echo-schema';
import { LocalStorageStore } from '@dxos/local-storage';
import { type AttentionPluginProvides, parseAttentionPlugin } from '@dxos/plugin-attention';
import { parseClientPlugin } from '@dxos/plugin-client';
import { type ActionGroup, createExtension, isActionGroup } from '@dxos/plugin-graph';
import { ObservabilityAction } from '@dxos/plugin-observability/meta';
import { SpaceAction } from '@dxos/plugin-space';
import { ThreadType, MessageType, ChannelType } from '@dxos/plugin-space/types';
import {
  getSpace,
  getTextInRange,
  Filter,
  createDocAccessor,
  fullyQualifiedId,
  loadObjectReferences,
} from '@dxos/react-client/echo';
import { ScrollArea } from '@dxos/react-ui';
import { createAttendableAttributes } from '@dxos/react-ui-attention';
import { comments, createExternalCommentSync, listener } from '@dxos/react-ui-editor';
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
import { ThreadAction, type ThreadProvides, type ThreadPluginProvides, type ThreadSettingsProps } from './types';

type ThreadState = {
  /** An in-memory staging area for threads that are being drafted. */
  staging: Record<string, ThreadType[]>;
  current?: string | undefined;
  focus?: boolean;
};

type SubjectId = string;
const initialViewState = { showResolvedThreads: false };
type ViewStore = Record<SubjectId, typeof initialViewState>;

// TODO(Zan): Every instance of `cursor` should be replaced with `anchor`.
export const ThreadPlugin = (): PluginDefinition<ThreadPluginProvides> => {
  const settings = new LocalStorageStore<ThreadSettingsProps>(THREAD_PLUGIN);
  const state = create<ThreadState>({ staging: {} });

  const viewStore = create<ViewStore>({});
  const getViewState = (subjectId: string) => {
    if (!viewStore[subjectId]) {
      viewStore[subjectId] = { ...initialViewState };
    }
    return viewStore[subjectId];
  };

  let attentionPlugin: Plugin<AttentionPluginProvides> | undefined;
  let navigationPlugin: Plugin<LocationProvides> | undefined;
  let intentPlugin: Plugin<IntentPluginProvides> | undefined;
  let dispatch: IntentDispatcher | undefined;

  const unsubscribeCallbacks = [] as UnsubscribeCallback[];

  return {
    meta,
    ready: async (plugins) => {
      settings.prop({ key: 'standalone', type: LocalStorageStore.bool({ allowUndefined: true }) });

      attentionPlugin = resolvePlugin(plugins, parseAttentionPlugin);
      navigationPlugin = resolvePlugin(plugins, parseNavigationPlugin);
      intentPlugin = resolvePlugin(plugins, parseIntentPlugin)!;
      dispatch = intentPlugin?.provides.intent.dispatch;

      const graphPlugin = resolvePlugin(plugins, parseGraphPlugin);
      const client = resolvePlugin(plugins, parseClientPlugin)?.provides.client;
      if (!client) {
        return;
      }

      // TODO(wittjosiah): This is a hack to make standalone threads work in the c11y sidebar.
      //  This should have a better solution when deck is introduced.
      const channelsQuery = client.spaces.query(Filter.schema(ChannelType));
      const queryUnsubscribe = channelsQuery.subscribe();
      const unsubscribe = effect(() => {
        const attention = attentionPlugin?.provides.attention;
        if (!attention?.attended) {
          return;
        }

        const firstAttendedNodeWithComments = Array.from(attention.attended)
          .map((id) => graphPlugin?.provides.graph.findNode(id))
          .find((node) => {
            const data = node?.data as { threads?: unknown };
            return Array.isArray(data?.threads) && data.threads.length > 0;
          });

        if (firstAttendedNodeWithComments) {
          void intentPlugin?.provides.intent.dispatch({
            action: NavigationAction.OPEN,
            data: {
              activeParts: {
                complementary: `${firstAttendedNodeWithComments.id}${SLUG_PATH_SEPARATOR}comments`,
              },
            },
          });
        }
      });

      unsubscribeCallbacks.push(queryUnsubscribe);
      unsubscribeCallbacks.push(unsubscribe);
    },
    unload: async () => {
      unsubscribeCallbacks.forEach((unsubscribe) => unsubscribe());
    },
    provides: {
      settings: settings.values,
      metadata: {
        records: {
          [ChannelType.typename]: {
            placeholder: ['channel title placeholder', { ns: THREAD_PLUGIN }],
            icon: (props: IconProps) => <Chat {...props} />,
            iconSymbol: 'ph--chat--regular',
            // TODO(wittjosiah): Move out of metadata.
            loadReferences: (channel: ChannelType) => loadObjectReferences(channel, (channel) => channel.threads),
          },
          [ThreadType.typename]: {
            // TODO(wittjosiah): Move out of metadata.
            loadReferences: (thread: ThreadType) => loadObjectReferences(thread, (thread) => thread.messages),
          },
          [MessageType.typename]: {
            // TODO(wittjosiah): Move out of metadata.
            loadReferences: (message: MessageType) => [], // loadObjectReferences(message, (message) => [...message.parts, message.context]),
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
      echo: { schema: [ChannelType, ThreadType, MessageType] },
      graph: {
        builder: (plugins) => {
          const client = resolvePlugin(plugins, parseClientPlugin)?.provides.client;
          const dispatch = resolvePlugin(plugins, parseIntentPlugin)?.provides.intent.dispatch;
          const metadataResolver = resolvePlugin(plugins, parseMetadataResolverPlugin)?.provides.metadata.resolver;

          if (!client || !dispatch || !metadataResolver) {
            return [];
          }

          return [
            createExtension({
              id: `${THREAD_PLUGIN}/comments-for-subject`,
              resolver: ({ id }) => {
                if (!id.endsWith('~comments')) {
                  return;
                }

                // TODO(Zan): Find util (or make one)
                const docId = id.split('~').at(0);
                const [spaceId, objectId] = docId?.split(':') ?? [];
                const space = client.spaces.get().find((space) => space.id === spaceId);
                const doc = space?.db.getObjectById(objectId);

                if (!doc || !docId) {
                  return;
                }

                const docMeta = metadataResolver(getTypename(doc) ?? '');
                const label = docMeta.label?.(doc) ||
                  doc.name ||
                  docMeta.placeholder || ['unnamed object threads label', { ns: THREAD_PLUGIN }];

                const viewState = getViewState(docId);

                return {
                  id,
                  type: 'orphan-comments-for-subject',
                  data: doc,
                  properties: {
                    icon: meta.iconComponent,
                    label,
                    showResolvedThreads: viewState.showResolvedThreads,
                  },
                };
              },
              actions: ({ node }) => {
                const dataId = node.id.split('~').at(0);

                if (!node.id.endsWith('~comments') || !dataId) {
                  return;
                }

                const [spaceId, objectId] = dataId.split(':');

                const viewState = getViewState(dataId);
                const toggle = () => {
                  const newToggleState = !viewState.showResolvedThreads;
                  viewState.showResolvedThreads = newToggleState;
                  void dispatch({
                    action: ObservabilityAction.SEND_EVENT,
                    data: {
                      name: 'threads.toggle-show-resolved',
                      properties: { spaceId, threadId: objectId, showResolved: newToggleState },
                    },
                  });
                };

                return [
                  {
                    id: `${THREAD_PLUGIN}/toggle-show-resolved/${node.id}`,
                    data: toggle,
                    properties: {
                      label: ['toggle show resolved', { ns: THREAD_PLUGIN }],
                      menuItemType: 'toggle',
                      isChecked: viewState.showResolvedThreads,
                      testId: 'threadPlugin.toggleShowResolved',
                    },
                  },
                ];
              },
            }),
            createExtension({
              id: ThreadAction.CREATE,
              filter: (node): node is ActionGroup =>
                !!settings.values.standalone && isActionGroup(node) && node.id.startsWith(SpaceAction.ADD_OBJECT),
              actions: ({ node }) => {
                const id = node.id.split('/').at(-1);
                const [spaceId, objectId] = id?.split(':') ?? [];
                const space = client.spaces.get().find((space) => space.id === spaceId);
                const object = objectId && space?.db.getObjectById(objectId);
                const target = objectId ? object : space;
                if (!target) {
                  return;
                }

                return [
                  {
                    id: `${THREAD_PLUGIN}/create/${node.id}`,
                    data: async () => {
                      await dispatch([
                        { plugin: THREAD_PLUGIN, action: ThreadAction.CREATE },
                        { action: SpaceAction.ADD_OBJECT, data: { target } },
                        { action: NavigationAction.OPEN },
                      ]);
                    },
                    properties: {
                      label: ['create channel label', { ns: THREAD_PLUGIN }],
                      icon: (props: IconProps) => <Chat {...props} />,
                      iconSymbol: 'ph--chat--regular',
                      testId: 'threadPlugin.createObject',
                    },
                  },
                ];
              },
            }),
          ];
        },
      },
      surface: {
        component: ({ data, role }) => {
          switch (role) {
            case 'main': {
              return data.active instanceof ChannelType && data.active.threads[0] ? (
                <ThreadMain thread={data.active.threads[0]} />
              ) : null;
            }

            case 'settings': {
              return data.plugin === meta.id ? <ThreadSettings settings={settings.values} /> : null;
            }

            case 'article':
            case 'complementary': {
              const location = navigationPlugin?.provides.location;

              const providesThreadsConfig = useCallback(
                (plugin: any): Plugin<ThreadProvides<any>> | undefined =>
                  // TODO(Zan): More robust runtime check.
                  'thread' in plugin.provides ? (plugin as Plugin<ThreadProvides<any>>) : undefined,
                [],
              );

              const threadsIntegrators = useResolvePlugins(providesThreadsConfig);
              const threadProvides = threadsIntegrators.map((p) => p.provides.thread);

              if (data.object instanceof ChannelType && data.object.threads[0]) {
                const channel = data.object;
                // TODO(zan): Maybe we should have utility for positional main object ids.
                if (isLayoutParts(location?.active) && location.active.main) {
                  const layoutEntries = location.active.main;

                  const currentPosition = layoutEntries.findIndex((entry) => channel.id === entry.id);

                  if (currentPosition > 0) {
                    const objectToTheLeft = layoutEntries[currentPosition - 1];
                    const context = getSpace(data.object)?.db.getObjectById(objectToTheLeft.id);
                    return <ThreadArticle thread={data.object.threads[0]} context={context} />;
                  }
                }

                return <ThreadArticle thread={data.object.threads[0]} />;
              }

              if (data.subject instanceof ThreadType) {
                return (
                  <>
                    <ChatHeading attendableId={data.subject.id} />
                    <ChatContainer thread={data.subject} />
                  </>
                );
              }

              if (
                data.subject &&
                typeof data.subject === 'object' &&
                'threads' in data.subject &&
                Array.isArray(data.subject.threads)
              ) {
                const threads = data.subject.threads
                  .concat(state.staging[fullyQualifiedId(data.subject)])
                  .filter(nonNullable);

                const createSort = threadProvides.find((p) => p.predicate(data.subject))?.createSort;
                if (createSort) {
                  const sort = createSort(data.subject);
                  threads.sort((a, b) => sort(a.anchor, b.anchor));
                }

                const detached = data.subject.threads
                  .filter(nonNullable)
                  .filter(({ anchor }) => !anchor)
                  .map((thread) => thread.id);

                const qualifiedSubjectId = fullyQualifiedId(data.subject);
                const attention = attentionPlugin?.provides.attention?.attended ?? new Set([qualifiedSubjectId]);
                const attendableAttrs = createAttendableAttributes(qualifiedSubjectId);
                const { showResolvedThreads } = getViewState(qualifiedSubjectId);

                return (
                  <div role='none' className='contents group/attention' {...attendableAttrs}>
                    {role === 'complementary' && <CommentsHeading attendableId={qualifiedSubjectId} />}
                    <ScrollArea.Root classNames='row-span-2'>
                      <ScrollArea.Viewport>
                        <CommentsContainer
                          threads={threads}
                          detached={detached}
                          currentId={attention.has(qualifiedSubjectId) ? state.current : undefined}
                          autoFocusCurrentTextbox={state.focus}
                          showResolvedThreads={showResolvedThreads}
                          onThreadAttend={(thread) => {
                            if (state.current !== thread.id) {
                              state.current = thread.id;
                              void dispatch?.({
                                action: LayoutAction.SCROLL_INTO_VIEW,
                                data: {
                                  id: fullyQualifiedId(data.subject!),
                                  thread: fullyQualifiedId(thread),
                                  cursor: thread.anchor,
                                },
                              });
                            }
                          }}
                          onThreadDelete={(thread) => {
                            return dispatch?.({
                              plugin: THREAD_PLUGIN,
                              action: ThreadAction.DELETE,
                              data: { subject: data.subject, thread },
                            });
                          }}
                          onMessageDelete={(thread, messageId) =>
                            dispatch?.({
                              plugin: THREAD_PLUGIN,
                              action: ThreadAction.DELETE_MESSAGE,
                              data: { subject: data.subject, thread, messageId },
                            })
                          }
                          onThreadToggleResolved={(thread) =>
                            dispatch?.({
                              plugin: THREAD_PLUGIN,
                              action: ThreadAction.TOGGLE_RESOLVED,
                              data: { thread },
                            })
                          }
                          onComment={(thread) => {
                            void intentPlugin?.provides.intent.dispatch({
                              action: ThreadAction.ON_MESSAGE_ADD,
                              data: { thread, subject: data.subject },
                            });
                          }}
                        />
                        <div role='none' className='bs-10' />
                        <ScrollArea.Scrollbar>
                          <ScrollArea.Thumb />
                        </ScrollArea.Scrollbar>
                      </ScrollArea.Viewport>
                    </ScrollArea.Root>
                  </div>
                );
              }
            }
          }

          return null;
        },
      },
      intent: {
        resolver: async (intent) => {
          switch (intent.action) {
            case ThreadAction.CREATE: {
              if (intent.data && intent.data.cursor !== undefined) {
                const { cursor, name, subject } = intent.data;

                const subjectId = fullyQualifiedId(subject);
                const thread = create(ThreadType, { name, anchor: cursor, messages: [], status: 'staged' });

                const stagingArea = state.staging[subjectId];
                if (stagingArea) {
                  stagingArea.push(thread);
                } else {
                  state.staging[subjectId] = [thread];
                }

                return {
                  data: thread,
                  intents: [
                    [
                      {
                        action: NavigationAction.OPEN,
                        data: {
                          activeParts: {
                            complementary: `${subjectId}${SLUG_PATH_SEPARATOR}comments${SLUG_COLLECTION_INDICATOR}`,
                          },
                        },
                      },
                      {
                        action: ThreadAction.SELECT,
                        data: { current: thread.id, focus: true },
                      },
                      {
                        action: LayoutAction.SET_LAYOUT,
                        data: {
                          element: 'complementary',
                          subject: subjectId,
                          state: true,
                        },
                      },
                    ],
                  ],
                };
              } else {
                // NOTE: This is the standalone thread creation case.
                return { data: create(ChannelType, { threads: [create(ThreadType, { messages: [] })] }) };
              }
            }

            case ThreadAction.SELECT: {
              state.focus = intent.data?.current === state.current ? state.focus : intent.data?.focus;
              state.current = intent.data?.current;
              return { data: true };
            }

            case ThreadAction.TOGGLE_RESOLVED: {
              const { thread } = intent.data ?? {};
              if (!(thread instanceof ThreadType)) {
                return;
              }

              if (thread.status === 'active' || thread.status === undefined) {
                thread.status = 'resolved';
              } else if (thread.status === 'resolved') {
                thread.status = 'active';
              }

              const space = getSpace(thread);
              const spaceId = space?.id;

              return {
                intents: [
                  [
                    {
                      action: ObservabilityAction.SEND_EVENT,
                      data: { name: 'threads.toggle-resolved', properties: { threadId: thread.id, spaceId } },
                    },
                  ],
                ],
              };
            }

            case ThreadAction.DELETE: {
              const { subject, thread } = intent.data ?? {};
              if (
                !(thread instanceof ThreadType) ||
                !(subject && typeof subject === 'object' && 'threads' in subject)
              ) {
                return;
              }

              const subjectId = fullyQualifiedId(subject);
              const stagingArea = state.staging[subjectId];
              if (stagingArea) {
                // Check if we're deleting a thread that's in the staging area.
                // If so, remove it from the staging area without ceremony.
                const index = stagingArea.findIndex((t) => t.id === thread.id);
                if (index !== -1) {
                  stagingArea.splice(index, 1);
                  return { data: true };
                }
              }

              const space = getSpace(thread);
              if (!space || !subject.threads) {
                return;
              }

              if (!intent.undo) {
                const index = subject.threads.findIndex((t) => t?.id === thread.id);
                const cursor = subject.threads[index]?.anchor;
                if (index !== -1) {
                  subject.threads?.splice(index, 1);
                }

                space.db.remove(thread);

                return {
                  undoable: {
                    message: translations[0]['en-US'][THREAD_PLUGIN]['thread deleted label'],
                    data: { cursor },
                  },
                  intents: [
                    [
                      {
                        action: ObservabilityAction.SEND_EVENT,
                        data: { name: 'threads.delete', properties: { threadId: thread.id, spaceId: space.id } },
                      },
                    ],
                  ],
                };
              } else if (intent.undo) {
                // TODO(wittjosiah): SDK should do this automatically.
                const savedThread = space.db.add(thread);
                subject.threads.push(savedThread);

                return {
                  data: true,
                  intents: [
                    [
                      {
                        action: ObservabilityAction.SEND_EVENT,
                        data: { name: 'threads.undo-delete', properties: { threadId: thread.id, spaceId: space.id } },
                      },
                    ],
                  ],
                };
              }
              break;
            }

            case ThreadAction.ON_MESSAGE_ADD: {
              const { thread, subject } = intent.data ?? {};
              if (
                !(thread instanceof ThreadType) ||
                !(subject && typeof subject === 'object' && 'threads' in subject)
              ) {
                return;
              }

              const subjectId = fullyQualifiedId(subject);
              const space = getSpace(subject);
              const intents = [];
              const analyticsProperties = { threadId: thread.id, spaceId: space?.id };

              if (state.staging[subjectId]?.find((t) => t === thread)) {
                // Move thread from staging to document.
                thread.status = 'active';
                subject.threads ? subject.threads.push(thread) : (subject.threads = [thread]);
                state.staging[subjectId] = state.staging[subjectId]?.filter((t) => t.id !== thread.id);

                intents.push({
                  action: ObservabilityAction.SEND_EVENT,
                  data: { name: 'threads.thread-created', properties: analyticsProperties },
                });
              }

              intents.push({
                action: ObservabilityAction.SEND_EVENT,
                data: {
                  name: 'threads.message-added',
                  properties: { ...analyticsProperties, threadLength: thread.messages.length },
                },
              });

              return {
                data: thread,
                intents: [intents],
              };
            }

            case ThreadAction.DELETE_MESSAGE: {
              const { subject, thread, messageId } = intent.data ?? {};
              const space = getSpace(subject);

              if (
                !(thread instanceof ThreadType) ||
                !(subject && typeof subject === 'object' && 'threads' in subject)
              ) {
                return;
              }

              if (!intent.undo) {
                const message = thread.messages.find((m) => m?.id === messageId);
                const messageIndex = thread.messages.findIndex((m) => m?.id === messageId);
                if (messageIndex === -1 || !message) {
                  return undefined;
                }

                if (messageIndex === 0 && thread.messages.length === 1) {
                  // If the message is the only message in the thread, delete the thread.
                  return {
                    intents: [[{ action: ThreadAction.DELETE, data: { subject, thread } }]],
                  };
                } else {
                  thread.messages.splice(messageIndex, 1);
                }

                return {
                  undoable: {
                    message: translations[0]['en-US'][THREAD_PLUGIN]['message deleted label'],
                    data: { message, messageIndex },
                  },
                  intents: [
                    [
                      {
                        action: ObservabilityAction.SEND_EVENT,
                        data: {
                          name: 'threads.message.delete',
                          properties: { threadId: thread.id, spaceId: space.id },
                        },
                      },
                    ],
                  ],
                };
              } else if (intent.undo) {
                const message = intent.data?.message;
                const messageIndex = intent.data?.messageIndex;

                if (!(message instanceof MessageType) || !(typeof messageIndex === 'number')) {
                  return;
                }

                thread.messages.splice(messageIndex, 0, message);

                return {
                  data: true,
                  intents: [
                    [
                      {
                        action: ObservabilityAction.SEND_EVENT,
                        data: {
                          name: 'threads.message.undo-delete',
                          properties: { threadId: thread.id, spaceId: space.id },
                        },
                      },
                    ],
                  ],
                };
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
            // Include no-op comments extension here to ensure that the facets are always present when they are expected.
            // TODO(wittjosiah): The Editor should only look for these facets when comments are available.
            return [comments()];
          }

          // TODO(Zan): When we have the deepsignal specific equivalent of this we should use that instead.
          const threads = computed(() =>
            [...doc.threads.filter(nonNullable), ...(state.staging[fullyQualifiedId(doc)] ?? [])].filter(
              (thread) => !(thread?.status === 'resolved'),
            ),
          );

          return [
            listener({
              onChange: () => {
                doc.threads.forEach((thread) => {
                  if (thread?.anchor) {
                    const [start, end] = thread.anchor.split(':');
                    const name = doc.content && getTextInRange(createDocAccessor(doc.content, ['content']), start, end);
                    // TODO(burdon): This seems unsafe; review.
                    // Only update if the name has changed, otherwise this will cause an infinite loop.
                    // Skip if the name is empty - this means comment text was deleted, but thread name should remain.
                    if (name && name !== thread.name) {
                      thread.name = name;
                    }
                  }
                });
              },
            }),
            createExternalCommentSync(
              doc.id,
              (sink) => effect(() => sink()),
              () =>
                threads.value
                  .filter((thread) => thread?.anchor)
                  .map((thread) => ({ id: thread.id, cursor: thread.anchor! })),
            ),
            comments({
              id: doc.id,
              onCreate: ({ cursor }) => {
                const [start, end] = cursor.split(':');
                const name = doc.content && getTextInRange(createDocAccessor(doc.content, ['content']), start, end);

                void intentPlugin?.provides.intent.dispatch({
                  action: ThreadAction.CREATE,
                  data: {
                    cursor,
                    name,
                    subject: doc,
                  },
                });
              },
              onDelete: ({ id }) => {
                // If the thread is in the staging area, remove it.
                const stagingArea = state.staging[fullyQualifiedId(doc)];
                if (stagingArea) {
                  const index = stagingArea.findIndex((thread) => thread.id === id);
                  if (index !== -1) {
                    stagingArea.splice(index, 1);
                  }
                }

                const thread = doc.threads.find((thread) => thread?.id === id);
                if (thread) {
                  thread.anchor = undefined;
                }
              },
              onUpdate: ({ id, cursor }) => {
                const thread =
                  state.staging[fullyQualifiedId(doc)]?.find((thread) => thread.id === id) ??
                  doc.threads.find((thread) => thread?.id === id);

                if (thread instanceof ThreadType && thread.anchor) {
                  const [start, end] = thread.anchor.split(':');
                  thread.name = doc.content && getTextInRange(createDocAccessor(doc.content, ['content']), start, end);
                  thread.anchor = cursor;
                }
              },
              onSelect: ({ selection: { current, closest } }) => {
                const dispatch = intentPlugin?.provides.intent.dispatch;
                if (dispatch) {
                  void dispatch([{ action: ThreadAction.SELECT, data: { current: current ?? closest } }]);
                }
              },
            }),
          ];
        },
      },
    },
  };
};
