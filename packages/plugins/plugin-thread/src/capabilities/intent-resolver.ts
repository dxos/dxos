//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common, createIntent, createResolver } from '@dxos/app-framework';
import { sleep } from '@dxos/async';
import { Obj, Relation, Type } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { ATTENDABLE_PATH_SEPARATOR, DeckAction } from '@dxos/plugin-deck/types';
import { ObservabilityAction } from '@dxos/plugin-observability/types';
import { SpaceAction } from '@dxos/plugin-space/types';
import { Ref } from '@dxos/react-client/echo';
import { Collection } from '@dxos/schema';
import { AnchoredTo, Message, Thread } from '@dxos/types';

import { meta } from '../meta';
import { Channel, ThreadAction } from '../types';

import { ThreadCapabilities } from './capabilities';

export default Capability.makeModule((context) =>
  Capability.contributes(Common.Capability.IntentResolver, [
    createResolver({
      intent: ThreadAction.OnCreateSpace,
      resolve: ({ space, isDefault, rootCollection }) =>
        Effect.gen(function* () {
          if (isDefault) {
            return;
          }

          const { dispatch } = context.getCapability(Common.Capability.IntentDispatcher);
          const collection = Collection.makeManaged({ key: Type.getTypename(Channel.Channel) });
          rootCollection.objects.push(Ref.make(collection));

          const { object: channel } = yield* dispatch(
            createIntent(ThreadAction.CreateChannel, { name: 'General', spaceId: space.id }),
          );
          space.db.add(channel);
        }),
    }),
    createResolver({
      intent: ThreadAction.CreateChannel,
      resolve: ({ name }) => ({
        data: {
          object: Channel.make({ name }),
        },
      }),
    }),
    createResolver({
      intent: ThreadAction.CreateChannelThread,
      resolve: ({ channel }) => {
        const thread = Thread.make({ status: 'active' });
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
        const { state } = context.getCapability(ThreadCapabilities.MutableState);
        const subjectId = Obj.getDXN(subject).toString();
        const thread = Thread.make({ name });
        const anchor = Relation.make(AnchoredTo.AnchoredTo, {
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
            createIntent(ThreadAction.Select, { current: Obj.getDXN(thread).toString() }),
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

        const db = Obj.getDatabase(thread);
        invariant(db, 'Database not found');
        const spaceId = db.spaceId;

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
      resolve: async ({ subject, anchor, thread: _thread }, undo) => {
        const thread = _thread ?? (Relation.getSource(anchor) as Thread.Thread);
        const { state } = context.getCapability(ThreadCapabilities.MutableState);
        const subjectId = Obj.getDXN(subject).toString();
        const draft = state.drafts[subjectId];
        if (draft) {
          // Check if we're deleting a draft; if so, remo ve it.
          const index = draft.findIndex((a) => a.id === anchor.id);
          if (index !== -1) {
            draft.splice(index, 1);
            return;
          }
        }

        const db = Obj.getDatabase(thread);
        if (!db) {
          return;
        }

        if (!undo) {
          // TODO(wittjosiah): Without sleep, rendering crashes at `Relation.setSource(anchor)`.
          db.remove(anchor);
          await sleep(100);
          db.remove(thread);

          return {
            undoable: {
              message: ['thread deleted label', { ns: meta.id }],
              data: { thread, anchor },
            },
            intents: [
              createIntent(ObservabilityAction.SendEvent, {
                name: 'threads.delete',
                properties: {
                  spaceId: db.spaceId,
                  threadId: thread.id,
                },
              }),
            ],
          };
        } else {
          // TODO(wittjosiah): Without sleep, rendering crashes at `Relation.setSource(anchor)`.
          db.add(thread);
          await sleep(100);
          db.add(anchor);

          return {
            intents: [
              createIntent(ObservabilityAction.SendEvent, {
                name: 'threads.undo-delete',
                properties: {
                  spaceId: db.spaceId,
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
        const thread = Relation.getSource(anchor) as Thread.Thread;
        const { state } = context.getCapability(ThreadCapabilities.MutableState);
        const subjectId = Obj.getDXN(subject).toString();
        const db = Obj.getDatabase(subject);
        invariant(db, 'Database not found');

        const message = Obj.make(Message.Message, {
          created: new Date().toISOString(),
          sender,
          blocks: [{ _tag: 'text', text }],
          // TODO(wittjosiah): Context based on attention.
          // context: context ? Ref.make(context) : undefined,
        });
        thread.messages.push(Ref.make(message));

        const intents = [];
        const draft = state.drafts[subjectId]?.find((a) => a.id === anchor.id);
        if (draft) {
          // Move draft to document.
          thread.status = 'active';
          // TODO(wittjosiah): This causes the thread to flash as it transitions from draft to db.
          state.drafts[subjectId] = state.drafts[subjectId]?.filter((a) => a.id !== anchor.id);
          intents.push(createIntent(SpaceAction.AddObject, { object: thread, target: db, hidden: true }));
          intents.push(
            createIntent(SpaceAction.AddRelation, {
              db,
              schema: AnchoredTo.AnchoredTo,
              source: thread,
              target: subject,
              fields: { anchor: draft.anchor },
            }),
          );
          intents.push(
            createIntent(ObservabilityAction.SendEvent, {
              name: 'threads.create',
              properties: {
                spaceId: db.spaceId,
                threadId: thread.id,
              },
            }),
          );
        }

        intents.push(
          createIntent(ObservabilityAction.SendEvent, {
            name: 'threads.message.add',
            properties: {
              spaceId: db.spaceId,
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
        const thread = Relation.getSource(anchor) as Thread.Thread;
        const db = Obj.getDatabase(subject);
        invariant(db, 'Database not found');

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
              message: ['message deleted label', { ns: meta.id }],
              data: { message, messageIndex },
            },
            intents: [
              createIntent(ObservabilityAction.SendEvent, {
                name: 'threads.message.delete',
                properties: {
                  spaceId: db.spaceId,
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
                  spaceId: db.spaceId,
                  threadId: thread.id,
                  messageId: message.id,
                },
              }),
            ],
          };
        }
      },
    }),
  ]),
);
