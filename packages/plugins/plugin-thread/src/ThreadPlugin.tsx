//
// Copyright 2023 DXOS.org
//

import React from 'react';

import {
  createSurface,
  type IntentPluginProvides,
  isLayoutParts,
  LayoutAction,
  NavigationAction,
  parseIntentPlugin,
  parseMetadataResolverPlugin,
  parseNavigationPlugin,
  type Plugin,
  type PluginDefinition,
  resolvePlugin,
} from '@dxos/app-framework';
import { type UnsubscribeCallback } from '@dxos/async';
import { LocalStorageStore } from '@dxos/local-storage';
import { log } from '@dxos/log';
import { parseClientPlugin } from '@dxos/plugin-client';
import { type ActionGroup, createExtension, isActionGroup, toSignal } from '@dxos/plugin-graph';
import { ObservabilityAction } from '@dxos/plugin-observability/meta';
import { memoizeQuery, SpaceAction } from '@dxos/plugin-space';
import { ChannelType, MessageType, ThreadType } from '@dxos/plugin-space/types';
import {
  create,
  fullyQualifiedId,
  getSpace,
  getTypename,
  loadObjectReferences,
  makeRef,
  parseId,
  type ReactiveEchoObject,
  SpaceState,
} from '@dxos/react-client/echo';
import { translations as threadTranslations } from '@dxos/react-ui-thread';

import { ThreadArticle, ThreadComplementary, ThreadSettings } from './components';
import { threads } from './extensions';
import meta, { THREAD_ITEM, THREAD_PLUGIN } from './meta';
import translations from './translations';
import { ThreadAction, type ThreadPluginProvides, type ThreadSettingsProps, type ThreadState } from './types';

type SubjectId = string;

const initialViewState = { showResolvedThreads: false };

type ViewStore = Record<SubjectId, typeof initialViewState>;

// TODO(Zan): Every instance of `cursor` should be replaced with `anchor`.
//  NOTE(burdon): Review/discuss CursorConverter semantics.
export const ThreadPlugin = (): PluginDefinition<
  Omit<ThreadPluginProvides, 'echo'>,
  Pick<ThreadPluginProvides, 'echo'>
> => {
  const settings = new LocalStorageStore<ThreadSettingsProps>(THREAD_PLUGIN);
  const state = create<ThreadState>({ drafts: {} });

  const viewStore = create<ViewStore>({});
  const getViewState = (subjectId: string) => {
    if (!viewStore[subjectId]) {
      viewStore[subjectId] = { ...initialViewState };
    }
    return viewStore[subjectId];
  };

  let intentPlugin: Plugin<IntentPluginProvides> | undefined;

  const unsubscribeCallbacks = [] as UnsubscribeCallback[];

  return {
    meta,
    initialize: async () => {
      settings.prop({ key: 'standalone', type: LocalStorageStore.bool({ allowUndefined: true }) });

      return {
        echo: {
          system: [ThreadType, MessageType],
          // TODO(wittjosiah): Requires reload.
          ...(settings.values.standalone ? { schema: [ChannelType] } : {}),
        },
      };
    },
    ready: async ({ plugins }) => {
      intentPlugin = resolvePlugin(plugins, parseIntentPlugin)!;
    },
    unload: async () => {
      unsubscribeCallbacks.forEach((unsubscribe) => unsubscribe());
    },
    provides: {
      settings: settings.values,
      metadata: {
        records: {
          [ChannelType.typename]: {
            createObject: ThreadAction.CREATE,
            placeholder: ['channel name placeholder', { ns: THREAD_PLUGIN }],
            icon: 'ph--chat--regular',
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
            parse: (item: ReactiveEchoObject<any>, type: string) => {
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
      complementary: {
        panels: [
          {
            id: 'comments',
            label: ['open comments panel label', { ns: THREAD_PLUGIN }],
            icon: 'ph--chat-text--regular',
          },
        ],
      },
      graph: {
        builder: (plugins) => {
          const client = resolvePlugin(plugins, parseClientPlugin)?.provides.client;
          const dispatch = resolvePlugin(plugins, parseIntentPlugin)?.provides.intent.dispatch;
          const metadataResolver = resolvePlugin(plugins, parseMetadataResolverPlugin)?.provides.metadata.resolver;
          if (!client || !dispatch || !metadataResolver) {
            return [];
          }

          const type = 'orphan-comments-for-subject';
          const icon = 'ph--chat-text--regular';

          return [
            createExtension({
              id: `${THREAD_PLUGIN}/comments-for-subject`,
              resolver: ({ id }) => {
                // TODO(Zan): Find util (or make one).
                if (!id.endsWith('~comments')) {
                  return;
                }

                const [subjectId] = id.split('~');
                const { spaceId, objectId } = parseId(subjectId);
                const spaces = toSignal(
                  (onChange) => client.spaces.subscribe(() => onChange()).unsubscribe,
                  () => client.spaces.get(),
                );
                const space = spaces?.find(
                  (space) => space.id === spaceId && space.state.get() === SpaceState.SPACE_READY,
                );
                if (!objectId) {
                  // TODO(wittjosiah): Support comments for arbitrary subjects.
                  //   This is to ensure that the comments panel is not stuck on an old object.
                  return {
                    id,
                    type,
                    data: null,
                    properties: {
                      icon,
                      label: ['unnamed object threads label', { ns: THREAD_PLUGIN }],
                      showResolvedThreads: false,
                      object: null,
                      space,
                    },
                  };
                }

                const [object] = memoizeQuery(space, { id: objectId });
                if (!object || !subjectId) {
                  return;
                }

                const meta = metadataResolver(getTypename(object) ?? '');
                const label = meta.label?.(object) ||
                  object.name ||
                  meta.placeholder || ['unnamed object threads label', { ns: THREAD_PLUGIN }];

                const viewState = getViewState(subjectId);

                return {
                  id,
                  type,
                  data: null,
                  properties: {
                    icon,
                    label,
                    showResolvedThreads: viewState.showResolvedThreads,
                    object,
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
                      icon: viewState.showResolvedThreads ? 'ph--eye-slash--regular' : 'ph--eye--regular',
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
                      icon: 'ph--chat--regular',
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
        definitions: ({ plugins }) => {
          const location = resolvePlugin(plugins, parseNavigationPlugin)?.provides.location;
          return [
            createSurface({
              id: `${THREAD_PLUGIN}/channel`,
              role: 'article',
              filter: (data): data is { subject: ChannelType } =>
                data.subject instanceof ChannelType && !!data.subject.threads[0],
              component: ({ data }) => {
                const channel = data.subject;
                const thread = channel.threads[0].target!;
                // TODO(zan): Maybe we should have utility for positional main object ids.
                if (isLayoutParts(location?.active) && location.active.main) {
                  const layoutEntries = location.active.main;
                  const currentPosition = layoutEntries.findIndex((entry) => channel.id === entry.id);
                  if (currentPosition > 0) {
                    const objectToTheLeft = layoutEntries[currentPosition - 1];
                    const context = getSpace(channel)?.db.getObjectById(objectToTheLeft.id);
                    return <ThreadArticle thread={thread} context={context} />;
                  }
                }

                return <ThreadArticle thread={thread} />;
              },
            }),
            createSurface({
              id: `${THREAD_PLUGIN}/thread`,
              role: 'complementary--comments',
              filter: (data): data is { subject: { threads: ThreadType[] } } =>
                !!data.subject &&
                typeof data.subject === 'object' &&
                'threads' in data.subject &&
                Array.isArray(data.subject.threads) &&
                !(data.subject instanceof ChannelType),
              component: ({ data }) => {
                const { showResolvedThreads } = getViewState(fullyQualifiedId(data.subject));
                return (
                  <ThreadComplementary
                    subject={data.subject}
                    drafts={state.drafts[fullyQualifiedId(data.subject)]}
                    current={state.current}
                    showResolvedThreads={showResolvedThreads}
                  />
                );
              },
            }),
            createSurface({
              id: `${THREAD_PLUGIN}/settings`,
              role: 'settings',
              filter: (data): data is any => data.plugin === THREAD_PLUGIN,
              component: () => <ThreadSettings settings={settings.values} />,
            }),
          ];
        },
      },
      intent: {
        resolver: async (intent) => {
          switch (intent.action) {
            case ThreadAction.CREATE: {
              if (intent.data && intent.data.cursor !== undefined) {
                const { cursor, name, subject } = intent.data;

                // Seed the threads array if it does not exist.
                if (subject?.threads === undefined) {
                  try {
                    // Static schema will throw an error if subject does not support threads array property.
                    subject.threads = [];
                  } catch (err) {
                    log.error('Subject does not support threads array', subject?.typename);
                    return;
                  }
                }

                const subjectId = fullyQualifiedId(subject);
                const thread = create(ThreadType, { name, anchor: cursor, messages: [], status: 'staged' });
                const draft = state.drafts[subjectId];
                if (draft) {
                  draft.push(thread);
                } else {
                  state.drafts[subjectId] = [thread];
                }

                return {
                  data: thread,
                  intents: [
                    [
                      {
                        action: ThreadAction.SELECT,
                        data: { current: fullyQualifiedId(thread) },
                      },
                    ],
                    [
                      {
                        action: NavigationAction.OPEN,
                        data: {
                          activeParts: { complementary: 'comments' },
                        },
                      },
                    ],
                    [
                      {
                        action: LayoutAction.SET_LAYOUT,
                        data: {
                          element: 'complementary',
                          state: true,
                        },
                      },
                    ],
                  ],
                };
              } else {
                // NOTE: This is the standalone thread creation case.
                return {
                  data: create(ChannelType, { threads: [makeRef(create(ThreadType, { messages: [] }))] }),
                };
              }
            }

            case ThreadAction.SELECT: {
              state.current = intent.data?.current;

              return {
                data: true,
                intents: !intent.data?.skipOpen
                  ? [
                      [
                        {
                          action: NavigationAction.OPEN,
                          data: {
                            activeParts: { complementary: 'comments' },
                          },
                        },
                      ],
                    ]
                  : [],
              };
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
                data: true,
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
              const draft = state.drafts[subjectId];
              if (draft) {
                // Check if we're deleting a draft; if so, remove it.
                const index = draft.findIndex((t) => t.id === thread.id);
                if (index !== -1) {
                  draft.splice(index, 1);
                  return { data: true };
                }
              }

              const space = getSpace(thread);
              if (!space || !subject.threads) {
                return;
              }

              if (!intent.undo) {
                const index = subject.threads.findIndex((t: any) => t?.id === thread.id);
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
                !(subject && typeof subject === 'object' && 'threads' in subject && Array.isArray(subject.threads))
              ) {
                return;
              }

              const subjectId = fullyQualifiedId(subject);
              const space = getSpace(subject);
              const intents = [];
              const analyticsProperties = { threadId: thread.id, spaceId: space?.id };

              if (state.drafts[subjectId]?.find((t) => t === thread)) {
                // Move draft to document.
                thread.status = 'active';
                subject.threads ? subject.threads.push(thread) : (subject.threads = [thread]);
                state.drafts[subjectId] = state.drafts[subjectId]?.filter(({ id }) => id !== thread.id);
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
                const message = thread.messages.find((m) => m?.target?.id === messageId);
                const messageIndex = thread.messages.findIndex((m) => m?.target?.id === messageId);
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
                          properties: { threadId: thread.id, spaceId: space?.id },
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

                thread.messages.splice(
                  messageIndex,
                  0,
                  makeRef(
                    create(MessageType, {
                      context: makeRef(message),
                      timestamp: message.timestamp,
                      sender: message.sender,
                      text: message.text,
                    }),
                  ),
                );
                return {
                  data: true,
                  intents: [
                    [
                      {
                        action: ObservabilityAction.SEND_EVENT,
                        data: {
                          name: 'threads.message.undo-delete',
                          properties: { threadId: thread.id, spaceId: space?.id },
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
        extensions: ({ document: doc }) => {
          return threads(state, doc, intentPlugin?.provides.intent.dispatch);
        },
      },
    },
  };
};
