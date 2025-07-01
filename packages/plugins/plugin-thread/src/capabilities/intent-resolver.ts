//
// Copyright 2025 DXOS.org
//

import { batch } from '@preact/signals-core';

import { Capabilities, contributes, createIntent, createResolver, type PluginContext } from '@dxos/app-framework';
import { Obj, Relation } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { ATTENDABLE_PATH_SEPARATOR, DeckAction } from '@dxos/plugin-deck/types';
import { ObservabilityAction } from '@dxos/plugin-observability/types';
import { SpaceAction } from '@dxos/plugin-space/types';
import { fullyQualifiedId, getSpace, Ref } from '@dxos/react-client/echo';
import { AnchoredTo, DataType } from '@dxos/schema';

import { ThreadCapabilities } from './capabilities';
import { THREAD_PLUGIN } from '../meta';
import { ChannelType, ThreadAction, ThreadType } from '../types';

export default (context: PluginContext) =>
  contributes(Capabilities.IntentResolver, [
    createResolver({
      intent: ThreadAction.CreateChannel,
      resolve: ({ name }) => ({
        data: {
          object: Obj.make(ChannelType, {
            name,
            defaultThread: Ref.make(Obj.make(ThreadType, { messages: [], status: 'active' })),
            threads: [],
          }),
        },
      }),
    }),
    createResolver({
      intent: ThreadAction.CreateChannelThread,
      resolve: ({ channel }) => {
        const thread = Obj.make(ThreadType, { messages: [], status: 'active' });
        channel.threads.push(Ref.make(thread));
        return {
          data: {
            object: thread,
          },
        };
      },
    }),
    // TODO(wittjosiah): Break this up into more composable pieces.
    createResolver({
      intent: ThreadAction.Create,
      resolve: ({ name, anchor: _anchor, subject }) => {
        const space = getSpace(subject);
        invariant(space, 'Space not found');

        const { state } = context.getCapability(ThreadCapabilities.MutableState);
        const subjectId = fullyQualifiedId(subject);
        const thread = Obj.make(ThreadType, { name, messages: [], status: 'staged' });
        const anchor = Relation.make(AnchoredTo, {
          [Relation.Source]: thread,
          [Relation.Target]: subject,
          anchor: _anchor,
        });

        const draft = state.drafts[subjectId];
        if (draft) {
          draft.push(anchor);
        } else {
          state.drafts[subjectId] = [anchor];
        }

        return {
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
      resolve: ({ subject, anchor, thread: _thread }, undo) => {
        const thread = _thread ?? (Relation.getSource(anchor) as ThreadType);
        const { state } = context.getCapability(ThreadCapabilities.MutableState);
        const subjectId = fullyQualifiedId(subject);
        const draft = state.drafts[subjectId];
        if (draft) {
          // Check if we're deleting a draft; if so, remo ve it.
          const index = draft.findIndex((a) => a.id === anchor.id);
          if (index !== -1) {
            draft.splice(index, 1);
            return;
          }
        }

        const space = getSpace(anchor);
        if (!space) {
          return;
        }

        if (!undo) {
          batch(() => {
            space.db.remove(thread);
            space.db.remove(anchor);
          });

          return {
            undoable: {
              message: ['thread deleted label', { ns: THREAD_PLUGIN }],
              data: { thread, anchor },
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
          batch(() => {
            space.db.add(thread);
            space.db.add(anchor);
          });

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
      resolve: ({ anchor, subject, sender, text }) => {
        const thread = Relation.getSource(anchor) as ThreadType;
        const { state } = context.getCapability(ThreadCapabilities.MutableState);
        const subjectId = fullyQualifiedId(subject);
        const space = getSpace(subject);
        invariant(space, 'Space not found');
        const intents = [];

        const message = Obj.make(DataType.Message, {
          sender,
          created: new Date().toISOString(),
          blocks: [{ type: 'text', text }],
          // TODO(wittjosiah): Context based on attention.
          // context: context ? Ref.make(context) : undefined,
        });
        thread.messages.push(Ref.make(message));

        const draft = state.drafts[subjectId]?.find((a) => a.id === anchor.id);
        if (draft) {
          // Move draft to document.
          thread.status = 'active';
          // TODO(wittjosiah): This causes the thread to flash as it transitions from draft to db.
          state.drafts[subjectId] = state.drafts[subjectId]?.filter((a) => a.id !== anchor.id);
          intents.push(createIntent(SpaceAction.AddObject, { object: thread, target: space, hidden: true }));
          intents.push(
            createIntent(SpaceAction.AddRelation, {
              space,
              schema: AnchoredTo,
              source: thread,
              target: subject,
              fields: { anchor: draft.anchor },
            }),
          );
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
      resolve: ({ subject, anchor, messageId, message, messageIndex }, undo) => {
        const thread = Relation.getSource(anchor) as ThreadType;
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
              intents: [createIntent(ThreadAction.Delete, { subject, anchor })],
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
