//
// Copyright 2023 DXOS.org
//

import { Chat, type IconProps } from '@phosphor-icons/react';
import { computed, effect, untracked } from '@preact/signals-core';
import React from 'react';

import { type AttentionPluginProvides, parseAttentionPlugin } from '@braneframe/plugin-attention';
import { parseClientPlugin } from '@braneframe/plugin-client';
import { type ActionGroup, createExtension, isActionGroup } from '@braneframe/plugin-graph';
import { SpaceAction } from '@braneframe/plugin-space';
import { ThreadType, DocumentType, MessageType, ChannelType } from '@braneframe/types';
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
  parseMetadataResolverPlugin,
} from '@dxos/app-framework';
import { type UnsubscribeCallback } from '@dxos/async';
import { type EchoReactiveObject, getTypename } from '@dxos/echo-schema';
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
import { useAttendable } from '@dxos/react-ui-attention';
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
import { ThreadAction, type ThreadPluginProvides, type ThreadSettingsProps } from './types';

type ThreadState = {
  threads: Record<string, number>;
  staging: Record<string, ThreadType[]>;
  current?: string | undefined;
  focus?: boolean;
};

type SubjectId = string;
const initialViewState = { showResolvedThreads: false };
type ViewStore = Record<SubjectId, typeof initialViewState>;

// TODO(thure): Get source of truth from `react-ui-theme`.
const isMinSm = () => window.matchMedia('(min-width:768px)').matches;

export const ThreadPlugin = (): PluginDefinition<ThreadPluginProvides> => {
  const settings = new LocalStorageStore<ThreadSettingsProps>(THREAD_PLUGIN);
  const state = create<ThreadState>({ threads: {}, staging: {} });

  const viewStore = create<ViewStore>({});
  const getViewState = (subjectId: string) => {
    if (!viewStore[subjectId]) {
      viewStore[subjectId] = { ...initialViewState };
    }
    return viewStore[subjectId];
  };

  let attentionPlugin: Plugin<AttentionPluginProvides> | undefined;
  let navigationPlugin: Plugin<LocationProvides> | undefined;
  let isDeckModel = false;
  let intentPlugin: Plugin<IntentPluginProvides> | undefined;

  const unsubscribeCallbacks = [] as UnsubscribeCallback[];

  return {
    meta,
    ready: async (plugins) => {
      settings.prop({ key: 'standalone', type: LocalStorageStore.bool({ allowUndefined: true }) });

      attentionPlugin = resolvePlugin(plugins, parseAttentionPlugin);
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
      const channelsQuery = client.spaces.query(Filter.schema(ChannelType));
      const queryUnsubscribe = channelsQuery.subscribe();
      const unsubscribe = isDeckModel
        ? effect(() => {
            const attention = attentionPlugin?.provides.attention;
            if (!attention?.attended) {
              return;
            }

            const firstAttendedNodeWithComments = Array.from(attention.attended)
              .map((id) => graphPlugin?.provides.graph.findNode(id))
              .find((node) => node?.data instanceof DocumentType && (node.data.threads?.length ?? 0) > 0);

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
              const [channel] = channelsQuery.objects.filter((channel) => getSpace(channel) === space);
              if (
                activeNode &&
                activeNode?.data instanceof DocumentType &&
                (activeNode.data.threads?.length ?? 0) > 0
              ) {
                void intentPlugin?.provides.intent.dispatch({
                  action: LayoutAction.SET_LAYOUT,
                  data: {
                    element: 'complementary',
                    subject: activeNode.data,
                    state: isMinSm(),
                  },
                });
              } else if (settings.values.standalone && channel && !(activeNode?.data instanceof ChannelType)) {
                void intentPlugin?.provides.intent.dispatch({
                  action: LayoutAction.SET_LAYOUT,
                  data: {
                    element: 'complementary',
                    subject: channel.threads[0],
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
                // const label = docMeta.label?.(doc) || doc.name || docMeta.placeholder;

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

                const viewState = getViewState(dataId);
                const toggle = () => {
                  viewState.showResolvedThreads = !viewState.showResolvedThreads;
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
              const dispatch = intentPlugin?.provides.intent.dispatch;
              const location = navigationPlugin?.provides.location;

              if (data.object instanceof ChannelType && data.object.threads[0]) {
                // TODO(zan): Maybe we should have utility for positional main object ids.
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
                    const context = getSpace(data.object)?.db.getObjectById(objectToTheLeft);
                    return <ThreadArticle thread={data.object.threads[0]} context={context} />;
                  }
                }

                return <ThreadArticle thread={data.object.threads[0]} />;
              }

              if (data.subject instanceof DocumentType) {
                // Sort threads by y-position.
                // TODO(burdon): Should just use document position?
                // TODO(zan): There's a bug here. When two threads have the same y-position they need to
                // be sorted by their x-position.
                const threads = data.subject.threads
                  .concat(state.staging[data.subject.id])
                  .filter(nonNullable)
                  .toSorted((a, b) => state.threads[a.id] - state.threads[b.id]);

                const detached = data.subject.threads
                  .filter(nonNullable)
                  .filter(({ anchor }) => !anchor)
                  .map((thread) => thread.id);

                const qualifiedSubjectId = fullyQualifiedId(data.subject);
                const attention = attentionPlugin?.provides.attention?.attended ?? new Set([qualifiedSubjectId]);
                const attendableAttrs = useAttendable(qualifiedSubjectId);
                const space = getSpace(data.subject);
                const context = space?.db.getObjectById(firstMainId(location?.active));
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
                          context={context}
                          autoFocusCurrentTextbox={state.focus}
                          showResolvedThreads={showResolvedThreads}
                          onThreadAttend={(thread) => {
                            if (state.current !== thread.id) {
                              state.current = thread.id;
                              void dispatch?.({
                                action: LayoutAction.SCROLL_INTO_VIEW,
                                data: { id: thread.id },
                              });
                            }
                          }}
                          onThreadDelete={(thread) =>
                            dispatch?.({
                              plugin: THREAD_PLUGIN,
                              action: ThreadAction.DELETE,
                              data: { document: data.subject, thread },
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
                            const doc = data.subject as DocumentType;
                            if (state.staging[doc.id]?.find((t) => t === thread)) {
                              // Move thread from staging to document.
                              thread.status = 'active';
                              doc.threads ? doc.threads.push(thread) : (doc.threads = [thread]);
                              state.staging[doc.id] = state.staging[doc.id]?.filter((t) => t.id !== thread.id);
                            }
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
              } else if (data.subject instanceof ThreadType) {
                const space = getSpace(data.subject);
                const context = space?.db.getObjectById(firstMainId(location?.active));
                return (
                  <>
                    <ChatHeading attendableId={data.subject.id} />
                    <ChatContainer thread={data.subject} context={context} />
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
              return { data: create(ChannelType, { threads: [create(ThreadType, { messages: [] })] }) };
            }

            case ThreadAction.SELECT: {
              state.threads = { ...state.threads, ...intent.data?.threads };
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

              break;
            }

            case ThreadAction.DELETE: {
              const { document: doc, thread } = intent.data ?? {};
              if (!(doc instanceof DocumentType) || !(thread instanceof ThreadType)) {
                return;
              }

              const stagingArea = state.staging[doc.id];
              if (stagingArea) {
                // Check if we're deleting a thread that's in the staging area.
                // If so, remove it from the staging area without ceremony.
                const index = state.staging[doc.id]?.findIndex((t) => t.id === thread.id);
                if (index !== -1) {
                  state.staging[doc.id]?.splice(index, 1);
                  return;
                }
              }

              const space = getSpace(thread);
              if (!space || !doc.threads) {
                return;
              }

              if (!intent.undo) {
                const index = doc.threads.findIndex((t) => t.id === thread.id);
                const cursor = doc.threads[index]?.anchor;
                if (index !== -1) {
                  doc.threads?.splice(index, 1);
                }

                space.db.remove(thread);

                return {
                  undoable: {
                    message: translations[0]['en-US'][THREAD_PLUGIN]['thread deleted label'],
                    data: { cursor },
                  },
                };
              } else if (intent.undo) {
                // TODO(wittjosiah): SDK should do this automatically.
                const savedThread = space.db.add(thread);
                doc.threads.push(savedThread);
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

          // TODO(Zan): When we have the deepsignal specific equivalent of this we should use that instead.
          const threads = computed(() =>
            [...doc.threads, ...(state.staging[doc.id] ?? [])].filter((thread) => !(thread?.status === 'resolved')),
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
              () => threads.value,
            ),
            comments({
              id: doc.id,
              onCreate: ({ cursor, location }) => {
                const [start, end] = cursor.split(':');
                const name = doc.content && getTextInRange(createDocAccessor(doc.content, ['content']), start, end);
                const thread = create(ThreadType, { name, anchor: cursor, messages: [], status: 'staged' });

                const stagingArea = state.staging[doc.id];
                if (stagingArea) {
                  stagingArea.push(thread);
                } else {
                  state.staging[doc.id] = [thread];
                }

                void intentPlugin?.provides.intent.dispatch([
                  ...(isDeckModel
                    ? [
                        {
                          action: NavigationAction.OPEN,
                          data: {
                            activeParts: {
                              complementary: `${fullyQualifiedId(doc)}${SLUG_PATH_SEPARATOR}comments${SLUG_COLLECTION_INDICATOR}`,
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
                // If the thread is in the staging area, remove it.
                const stagingArea = state.staging[doc.id];
                if (stagingArea) {
                  const index = stagingArea.findIndex((thread) => thread.id === id);
                  if (index !== -1) {
                    stagingArea.splice(index, 1);
                  }
                }

                const thread = doc.threads.find((thread) => thread.id === id);
                if (thread) {
                  thread.anchor = undefined;
                }
              },
              onUpdate: ({ id, cursor }) => {
                const thread =
                  state.staging[doc.id]?.find((thread) => thread.id === id) ??
                  doc.threads.find((thread) => thread.id === id);

                if (thread instanceof ThreadType && thread.anchor) {
                  const [start, end] = thread.anchor.split(':');
                  thread.name = doc.content && getTextInRange(createDocAccessor(doc.content, ['content']), start, end);
                  thread.anchor = cursor;
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
