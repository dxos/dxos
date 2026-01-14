//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common, OperationResolver, UndoMapping } from '@dxos/app-framework';
import { sleep } from '@dxos/async';
import { Obj, Relation, Type } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import * as Operation from '@dxos/operation';
import { ATTENDABLE_PATH_SEPARATOR, DeckOperation } from '@dxos/plugin-deck/types';
import { ObservabilityOperation } from '@dxos/plugin-observability/types';
import { SpaceOperation } from '@dxos/plugin-space/types';
import { Ref } from '@dxos/react-client/echo';
import { Collection } from '@dxos/schema';
import { AnchoredTo, Message, Thread } from '@dxos/types';

import { meta } from '../../meta';
import { Channel, ThreadCapabilities, ThreadOperation } from '../../types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const context = yield* Capability.PluginContextService;
    // State is accessed eagerly because it's used in sync handlers and needs consistent reference
    const { state } = yield* Capability.get(ThreadCapabilities.MutableState);

    return [
      Capability.contributes(Common.Capability.UndoMapping, [
        UndoMapping.make({
          operation: ThreadOperation.Delete,
          inverse: ThreadOperation.Restore,
          deriveContext: (_input, output) => {
            // Return undefined if not undoable (e.g., draft deletion or no db).
            if (!output.thread || !output.anchor) {
              return;
            }
            return {
              thread: output.thread,
              anchor: output.anchor,
            };
          },
          message: ['thread deleted label', { ns: meta.id }],
        }),
        UndoMapping.make({
          operation: ThreadOperation.DeleteMessage,
          inverse: ThreadOperation.RestoreMessage,
          deriveContext: (input, output) => {
            // Return undefined if not undoable (e.g., message not found or thread deleted).
            if (!output.message || output.messageIndex === undefined) {
              return;
            }
            return {
              anchor: input.anchor,
              message: output.message,
              messageIndex: output.messageIndex,
            };
          },
          message: ['message deleted label', { ns: meta.id }],
        }),
      ]),
      Capability.contributes(Common.Capability.OperationResolver, [
        //
        // CreateChannel
        //
        OperationResolver.make({
          operation: ThreadOperation.CreateChannel,
          handler: (input) =>
            Effect.sync(() => ({
              object: Channel.make({ name: input.name }),
            })),
        }),

        //
        // CreateChannelThread
        //
        OperationResolver.make({
          operation: ThreadOperation.CreateChannelThread,
          handler: (input) =>
            Effect.sync(() => {
              const thread = Thread.make({ status: 'active' });
              input.channel.threads.push(Ref.make(thread));
              return { object: thread };
            }),
        }),

        //
        // Select
        //
        OperationResolver.make({
          operation: ThreadOperation.Select,
          handler: (input) =>
            Effect.sync(() => {
              state.current = input.current;
            }),
        }),

        //
        // ToggleResolved
        //
        OperationResolver.make({
          operation: ThreadOperation.ToggleResolved,
          handler: (input) =>
            Effect.gen(function* () {
              const thread = input.thread;

              if (thread.status === 'active' || thread.status === undefined) {
                thread.status = 'resolved';
              } else if (thread.status === 'resolved') {
                thread.status = 'active';
              }

              const db = Obj.getDatabase(thread);
              invariant(db, 'Database not found');

              yield* Operation.schedule(ObservabilityOperation.SendEvent, {
                name: 'threads.toggle-resolved',
                properties: {
                  spaceId: db.spaceId,
                  threadId: thread.id,
                },
              });
            }),
        }),

        //
        // OnCreateSpace
        //
        OperationResolver.make({
          operation: ThreadOperation.OnCreateSpace,
          handler: ({ space, isDefault, rootCollection }) =>
            Effect.gen(function* () {
              if (isDefault) {
                return;
              }

              const { invoke } = yield* Capability.get(Common.Capability.OperationInvoker);
              const collection = Collection.makeManaged({ key: Type.getTypename(Channel.Channel) });
              rootCollection.objects.push(Ref.make(collection));

              const { object: channel } = yield* invoke(ThreadOperation.CreateChannel, {
                name: 'General',
                spaceId: space.id,
              });
              space.db.add(channel);
            }).pipe(Effect.provideService(Capability.PluginContextService, context)),
        }),

        //
        // Create
        //
        OperationResolver.make({
          operation: ThreadOperation.Create,
          handler: ({ name, anchor: _anchor, subject }) =>
            Effect.gen(function* () {
              const { invoke } = yield* Capability.get(Common.Capability.OperationInvoker);
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

              // Follow-up operations.
              yield* invoke(ThreadOperation.Select, { current: Obj.getDXN(thread).toString() });
              yield* invoke(DeckOperation.ChangeCompanion, {
                primary: subjectId,
                companion: `${subjectId}${ATTENDABLE_PATH_SEPARATOR}comments`,
              });
            }).pipe(Effect.provideService(Capability.PluginContextService, context)),
        }),

        //
        // Delete
        //
        OperationResolver.make({
          operation: ThreadOperation.Delete,
          handler: ({ subject, anchor, thread: _thread }) =>
            Effect.gen(function* () {
              const thread = _thread ?? (Relation.getSource(anchor) as Thread.Thread);
              const subjectId = Obj.getDXN(subject).toString();
              const draft = state.drafts[subjectId];
              if (draft) {
                // Check if we're deleting a draft; if so, remove it.
                const index = draft.findIndex((a: { id: string }) => a.id === anchor.id);
                if (index !== -1) {
                  draft.splice(index, 1);
                  // Draft deletion is not undoable.
                  return {};
                }
              }

              const db = Obj.getDatabase(thread);
              if (!db) {
                return {};
              }

              // TODO(wittjosiah): Without sleep, rendering crashes at `Relation.setSource(anchor)`.
              db.remove(anchor);
              yield* Effect.promise(() => sleep(100));
              db.remove(thread);

              // Schedule analytics event as followup (doesn't block return).
              yield* Operation.schedule(ObservabilityOperation.SendEvent, {
                name: 'threads.delete',
                properties: {
                  spaceId: db.spaceId,
                  threadId: thread.id,
                },
              });

              // Return data needed for undo.
              return { thread, anchor };
            }),
        }),

        //
        // AddMessage
        //
        OperationResolver.make({
          operation: ThreadOperation.AddMessage,
          handler: ({ anchor, subject, sender, text }) =>
            Effect.gen(function* () {
              const { invoke } = yield* Capability.get(Common.Capability.OperationInvoker);
              const thread = Relation.getSource(anchor) as Thread.Thread;
              const subjectId = Obj.getDXN(subject).toString();
              const db = Obj.getDatabase(subject);
              invariant(db, 'Database not found');

              const message = Obj.make(Message.Message, {
                created: new Date().toISOString(),
                sender,
                blocks: [{ _tag: 'text', text }],
              });
              thread.messages.push(Ref.make(message));

              const draft = state.drafts[subjectId]?.find((a: { id: string }) => a.id === anchor.id);
              if (draft) {
                // Move draft to document.
                thread.status = 'active';
                state.drafts[subjectId] = state.drafts[subjectId]?.filter((a: { id: string }) => a.id !== anchor.id);
                yield* invoke(SpaceOperation.AddObject, { object: thread, target: db, hidden: true });
                yield* invoke(SpaceOperation.AddRelation, {
                  db,
                  schema: AnchoredTo.AnchoredTo,
                  source: thread,
                  target: subject,
                  fields: { anchor: draft.anchor },
                });
                yield* Operation.schedule(ObservabilityOperation.SendEvent, {
                  name: 'threads.create',
                  properties: {
                    spaceId: db.spaceId,
                    threadId: thread.id,
                  },
                });
              }

              yield* Operation.schedule(ObservabilityOperation.SendEvent, {
                name: 'threads.message.add',
                properties: {
                  spaceId: db.spaceId,
                  threadId: thread.id,
                  threadLength: thread.messages.length,
                  messageId: message.id,
                  messageLength: text.length,
                },
              });
            }).pipe(Effect.provideService(Capability.PluginContextService, context)),
        }),

        //
        // DeleteMessage
        //
        OperationResolver.make({
          operation: ThreadOperation.DeleteMessage,
          handler: ({ subject, anchor, messageId }) =>
            Effect.gen(function* () {
              const { invoke } = yield* Capability.get(Common.Capability.OperationInvoker);
              const thread = Relation.getSource(anchor) as Thread.Thread;
              const db = Obj.getDatabase(subject);
              invariant(db, 'Database not found');

              const msgIndex = thread.messages.findIndex((ref) => ref.target?.id === messageId);
              const msg = thread.messages[msgIndex]?.target;
              if (!msg) {
                return { messageIndex: -1 };
              }

              if (msgIndex === 0 && thread.messages.length === 1) {
                // TODO(wittjosiah): This doesn't support restoring the thread.
                yield* invoke(ThreadOperation.Delete, { subject, anchor });
                return { messageIndex: -1 };
              }

              thread.messages.splice(msgIndex, 1);

              yield* Operation.schedule(ObservabilityOperation.SendEvent, {
                name: 'threads.message.delete',
                properties: {
                  spaceId: db.spaceId,
                  threadId: thread.id,
                  threadLength: thread.messages.length,
                  messageId,
                },
              });

              // Return data needed for undo.
              return { message: msg, messageIndex: msgIndex };
            }).pipe(Effect.provideService(Capability.PluginContextService, context)),
        }),

        //
        // Restore (inverse of Delete)
        //
        OperationResolver.make({
          operation: ThreadOperation.Restore,
          handler: ({ thread, anchor }) =>
            Effect.gen(function* () {
              const db = Obj.getDatabase(thread);
              if (!db) {
                return;
              }

              // TODO(wittjosiah): Without sleep, rendering crashes at `Relation.setSource(anchor)`.
              db.add(thread);
              yield* Effect.promise(() => sleep(100));
              db.add(anchor);

              // Schedule analytics event as followup (doesn't block return).
              yield* Operation.schedule(ObservabilityOperation.SendEvent, {
                name: 'threads.undo-delete',
                properties: {
                  spaceId: db.spaceId,
                  threadId: thread.id,
                },
              });
            }),
        }),

        //
        // RestoreMessage (inverse of DeleteMessage)
        //
        OperationResolver.make({
          operation: ThreadOperation.RestoreMessage,
          handler: ({ anchor, message, messageIndex }) =>
            Effect.gen(function* () {
              const thread = Relation.getSource(anchor) as Thread.Thread;
              const db = Obj.getDatabase(thread);
              invariant(db, 'Database not found');

              thread.messages.splice(messageIndex, 0, Ref.make(message));

              yield* Operation.schedule(ObservabilityOperation.SendEvent, {
                name: 'threads.message.undo-delete',
                properties: {
                  spaceId: db.spaceId,
                  threadId: thread.id,
                  messageId: message.id,
                },
              });
            }),
        }),
      ]),
    ];
  }),
);
