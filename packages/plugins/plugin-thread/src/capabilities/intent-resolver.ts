//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, createIntent, createResolver, type PluginContext } from '@dxos/app-framework';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { ATTENDABLE_PATH_SEPARATOR, DeckAction } from '@dxos/plugin-deck/types';
import { ObservabilityAction } from '@dxos/plugin-observability/types';
import { live, fullyQualifiedId, getSpace, Ref } from '@dxos/react-client/echo';
import { DataType } from '@dxos/schema';

import { ThreadCapabilities } from './capabilities';
import { THREAD_PLUGIN } from '../meta';
import { ChannelType, ThreadAction, ThreadType } from '../types';

export default (context: PluginContext) =>
  contributes(Capabilities.IntentResolver, [
    createResolver({
      intent: ThreadAction.CreateChannel,
      resolve: ({ name }) => ({
        data: {
          object: live(ChannelType, {
            name,
            defaultThread: Ref.make(live(ThreadType, { messages: [], status: 'active' })),
            threads: [],
          }),
        },
      }),
    }),
    createResolver({
      intent: ThreadAction.CreateChannelThread,
      resolve: ({ channel }) => {
        const thread = live(ThreadType, { messages: [], status: 'active' });
        channel.threads.push(Ref.make(thread));
        return {
          data: {
            object: thread,
          },
        };
      },
    }),
    createResolver({
      intent: ThreadAction.Create,
      resolve: ({ name, cursor, subject }) => {
        // Seed the threads array if it does not exist.
        if (subject?.threads === undefined) {
          try {
            // Static schema will throw an error if subject does not support threads array property.
            subject.threads = [];
          } catch (err) {
            log.error('Subject does not support threads array', { typename: subject?.typename });
            return;
          }
        }

        const { state } = context.getCapability(ThreadCapabilities.MutableState);
        const subjectId = fullyQualifiedId(subject);
        const thread = live(ThreadType, { name, anchor: cursor, messages: [], status: 'staged' });
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
            createIntent(DeckAction.ChangeCompanion, {
              primary: subjectId,
              companion: `${subjectId}${ATTENDABLE_PATH_SEPARATOR}comments`,
            }),
          ],
        };
      },
    }),
    createResolver({
      intent: ThreadAction.Select,
      resolve: ({ current }) => {
        const { state } = context.getCapability(ThreadCapabilities.MutableState);
        state.current = current;
      },
    }),
    createResolver({
      intent: ThreadAction.ToggleResolved,
      resolve: ({ thread }) => {
        if (thread.status === 'active' || thread.status === undefined) {
          thread.status = 'resolved';
        } else if (thread.status === 'resolved') {
          thread.status = 'active';
        }

        const space = getSpace(thread);
        invariant(space, 'Space not found');
        const spaceId = space.id;

        return {
          intents: [
            createIntent(ObservabilityAction.SendEvent, {
              name: 'threads.toggle-resolved',
              properties: {
                spaceId,
                threadId: thread.id,
              },
            }),
          ],
        };
      },
    }),
    createResolver({
      intent: ThreadAction.Delete,
      resolve: ({ subject, thread }, undo) => {
        const { state } = context.getCapability(ThreadCapabilities.MutableState);
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
                properties: {
                  spaceId: space.id,
                  threadId: thread.id,
                },
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
                properties: {
                  spaceId: space.id,
                  threadId: thread.id,
                },
              }),
            ],
          };
        }
      },
    }),
    createResolver({
      intent: ThreadAction.AddMessage,
      resolve: ({ thread, subject, sender, text }) => {
        const { state } = context.getCapability(ThreadCapabilities.MutableState);
        const subjectId = fullyQualifiedId(subject);
        const space = getSpace(subject);
        invariant(space, 'Space not found');
        const intents = [];

        const message = live(DataType.Message, {
          sender,
          created: new Date().toISOString(),
          blocks: [{ type: 'text', text }],
          // TODO(wittjosiah): Context based on attention.
          // context: context ? makeRef(context) : undefined,
        });
        thread.messages.push(Ref.make(message));

        if (state.drafts[subjectId]?.find((t) => t === thread)) {
          // Move draft to document.
          thread.status = 'active';
          subject.threads ? subject.threads.push(Ref.make(thread)) : (subject.threads = [Ref.make(thread)]);
          state.drafts[subjectId] = state.drafts[subjectId]?.filter(({ id }) => id !== thread.id);
          intents.push(
            createIntent(ObservabilityAction.SendEvent, {
              name: 'threads.create',
              properties: {
                spaceId: space.id,
                threadId: thread.id,
              },
            }),
          );
        }

        intents.push(
          createIntent(ObservabilityAction.SendEvent, {
            name: 'threads.message.add',
            properties: {
              spaceId: space.id,
              threadId: thread.id,
              threadLength: thread.messages.length,
              messageId: message.id,
              messageLength: text.length,
            },
          }),
        );

        return { intents };
      },
    }),
    createResolver({
      intent: ThreadAction.DeleteMessage,
      resolve: ({ subject, thread, messageId, message, messageIndex }, undo) => {
        const space = getSpace(subject);
        invariant(space, 'Space not found');

        if (!undo) {
          const messageIndex = thread.messages.findIndex(Ref.hasObjectId(messageId));
          const message = thread.messages[messageIndex]?.target;
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
                properties: {
                  spaceId: space.id,
                  threadId: thread.id,
                  messageId: message.id,
                },
              }),
            ],
          };
        } else {
          if (messageIndex === undefined || !message) {
            return;
          }

          thread.messages.splice(messageIndex, 0, Ref.make(message));
          return {
            intents: [
              createIntent(ObservabilityAction.SendEvent, {
                name: 'threads.message.undo-delete',
                properties: {
                  spaceId: space.id,
                  threadId: thread.id,
                  messageId: message.id,
                },
              }),
            ],
          };
        }
      },
    }),
  ]);
