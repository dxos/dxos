//
// Copyright 2023 DXOS.org
//

import React from 'react';

import {
  createIntent,
  createResolver,
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
import { parseClientPlugin } from '@dxos/plugin-client/types';
import { createExtension, toSignal } from '@dxos/plugin-graph';
import { ObservabilityAction } from '@dxos/plugin-observability/types';
import { memoizeQuery } from '@dxos/plugin-space';
import { ChannelType, MessageType, ThreadType } from '@dxos/plugin-space/types';
import {
  create,
  fullyQualifiedId,
  getSpace,
  getTypename,
  loadObjectReferences,
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
            createObject: (props: { name?: string }) => createIntent(ThreadAction.Create, props),
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
          const dispatch = resolvePlugin(plugins, parseIntentPlugin)?.provides.intent.dispatchPromise;
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
                const toggle = async () => {
                  const newToggleState = !viewState.showResolvedThreads;
                  viewState.showResolvedThreads = newToggleState;
                  await dispatch(
                    createIntent(ObservabilityAction.SendEvent, {
                      name: 'threads.toggle-show-resolved',
                      properties: { spaceId, threadId: objectId, showResolved: newToggleState },
                    }),
                  );
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
                const thread = channel.threads[0]!;
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
        resolvers: () => [
          createResolver(ThreadAction.Create, ({ name, cursor, subject }) => {
            if (cursor && subject) {
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
                data: { object: thread },
                intents: [
                  createIntent(ThreadAction.Select, { current: fullyQualifiedId(thread) }),
                  createIntent(NavigationAction.Open, { activeParts: { complementary: 'comments' } }),
                  createIntent(LayoutAction.SetLayout, { element: 'complementary', state: true }),
                ],
              };
            } else {
              // NOTE: This is the standalone thread creation case.
              return {
                data: { object: create(ChannelType, { threads: [create(ThreadType, { messages: [] })] }) },
              };
            }
          }),
          createResolver(ThreadAction.Select, ({ current, skipOpen }) => {
            state.current = current;

            return {
              intents: !skipOpen
                ? [createIntent(NavigationAction.Open, { activeParts: { complementary: 'comments' } })]
                : undefined,
            };
          }),
          createResolver(ThreadAction.ToggleResolved, ({ thread }) => {
            if (thread.status === 'active' || thread.status === undefined) {
              thread.status = 'resolved';
            } else if (thread.status === 'resolved') {
              thread.status = 'active';
            }

            const space = getSpace(thread);
            const spaceId = space?.id;

            return {
              intents: [
                createIntent(ObservabilityAction.SendEvent, {
                  name: 'threads.toggle-resolved',
                  properties: { threadId: thread.id, spaceId },
                }),
              ],
            };
          }),
          createResolver(ThreadAction.Delete, ({ subject, thread }, undo) => {
            const subjectId = fullyQualifiedId(subject);
            const draft = state.drafts[subjectId];
            if (draft) {
              // Check if we're deleting a draft; if so, remove it.
              const index = draft.findIndex((t) => t.id === thread.id);
              if (index !== -1) {
                draft.splice(index, 1);
                return;
              }
            }

            const space = getSpace(thread);
            if (!space || !subject.threads) {
              return;
            }

            if (!undo) {
              const index = subject.threads.findIndex((t: any) => t?.id === thread.id);
              const cursor = subject.threads[index]?.anchor;
              if (index !== -1) {
                subject.threads?.splice(index, 1);
              }

              space.db.remove(thread);

              return {
                undoable: {
                  message: ['thread deleted label', { ns: THREAD_PLUGIN }],
                  data: { cursor },
                },
                intents: [
                  createIntent(ObservabilityAction.SendEvent, {
                    name: 'threads.delete',
                    properties: { threadId: thread.id, spaceId: space.id },
                  }),
                ],
              };
            } else {
              // TODO(wittjosiah): SDK should do this automatically.
              const savedThread = space.db.add(thread);
              subject.threads.push(savedThread);

              return {
                intents: [
                  createIntent(ObservabilityAction.SendEvent, {
                    name: 'threads.undo-delete',
                    properties: { threadId: thread.id, spaceId: space.id },
                  }),
                ],
              };
            }
          }),
          createResolver(ThreadAction.OnMessageAdd, ({ thread, subject }) => {
            const subjectId = fullyQualifiedId(subject);
            const space = getSpace(subject);
            const intents = [];
            const analyticsProperties = { threadId: thread.id, spaceId: space?.id };

            if (state.drafts[subjectId]?.find((t) => t === thread)) {
              // Move draft to document.
              thread.status = 'active';
              subject.threads ? subject.threads.push(thread) : (subject.threads = [thread]);
              state.drafts[subjectId] = state.drafts[subjectId]?.filter(({ id }) => id !== thread.id);
              intents.push(
                createIntent(ObservabilityAction.SendEvent, {
                  name: 'threads.thread-created',
                  properties: analyticsProperties,
                }),
              );
            }

            intents.push(
              createIntent(ObservabilityAction.SendEvent, {
                name: 'threads.message-added',
                properties: { ...analyticsProperties, threadLength: thread.messages.length },
              }),
            );

            return { intents };
          }),
          createResolver(ThreadAction.DeleteMessage, ({ subject, thread, messageId, message, messageIndex }, undo) => {
            const space = getSpace(subject);

            if (!undo) {
              const messageIndex = thread.messages.findIndex((m) => m?.id === messageId);
              const message = thread.messages[messageIndex];
              if (!message) {
                return;
              }

              if (messageIndex === 0 && thread.messages.length === 1) {
                // If the message is the only message in the thread, delete the thread.
                return {
                  intents: [createIntent(ThreadAction.Delete, { subject, thread })],
                };
              } else {
                thread.messages.splice(messageIndex, 1);
              }

              return {
                undoable: {
                  message: ['message deleted label', { ns: THREAD_PLUGIN }],
                  data: { message, messageIndex },
                },
                intents: [
                  createIntent(ObservabilityAction.SendEvent, {
                    name: 'threads.message.delete',
                    properties: { threadId: thread.id, spaceId: space?.id },
                  }),
                ],
              };
            } else {
              if (!(typeof messageIndex === 'number')) {
                return;
              }

              thread.messages.splice(messageIndex, 0, message);
              return {
                intents: [
                  createIntent(ObservabilityAction.SendEvent, {
                    name: 'threads.message.undo-delete',
                    properties: { threadId: thread.id, spaceId: space?.id },
                  }),
                ],
              };
            }
          }),
        ],
      },
      markdown: {
        extensions: ({ document: doc }) => {
          return threads(state, doc, intentPlugin?.provides.intent.dispatchPromise);
        },
      },
    },
  };
};
