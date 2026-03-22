//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability, UndoMapping } from '@dxos/app-framework';
import { sleep } from '@dxos/async';
import { COMPANION_PREFIX } from '@dxos/app-toolkit';
import { Obj, Ref, Relation } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { Operation, OperationResolver } from '@dxos/operation';
import { DeckOperation } from '@dxos/plugin-deck/types';
import { ObservabilityOperation } from '@dxos/plugin-observability/types';
import { SpaceOperation } from '@dxos/plugin-space/types';
import { AnchoredTo, Message, Thread } from '@dxos/types';

import { meta } from '../../meta';
import { Channel, ThreadCapabilities, ThreadOperation } from '../../types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return [
      Capability.contributes(Capabilities.UndoMapping, [
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
      Capability.contributes(Capabilities.OperationResolver, [
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
              const threadRef = Ref.make(thread);
              Obj.change(input.channel, (obj) => {
                obj.threads.push(threadRef);
              });
              return { object: thread };
            }),
        }),

        //
        // Select
        //
        OperationResolver.make({
          operation: ThreadOperation.Select,
          handler: Effect.fnUntraced(function* (input) {
            const registry = yield* Capability.get(Capabilities.AtomRegistry);
            const stateAtom = yield* Capability.get(ThreadCapabilities.State);
            const current = registry.get(stateAtom);
            registry.set(stateAtom, { ...current, current: input.current });
          }),
        }),

        //
        // ToggleResolved
        //
        OperationResolver.make({
          operation: ThreadOperation.ToggleResolved,
          handler: Effect.fnUntraced(function* (input) {
            const thread = input.thread;

            Obj.change(thread, (obj) => {
              if (obj.status === 'active' || obj.status === undefined) {
                obj.status = 'resolved';
              } else if (obj.status === 'resolved') {
                obj.status = 'active';
              }
            });

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
          handler: Effect.fnUntraced(function* ({ space, isDefault }) {
            if (isDefault) {
              return;
            }

            const { object: channel } = yield* Operation.invoke(ThreadOperation.CreateChannel, {
              name: 'General',
              spaceId: space.id,
            });
            space.db.add(channel);
          }),
        }),

        //
        // Create
        //
        OperationResolver.make({
          operation: ThreadOperation.Create,
          handler: Effect.fnUntraced(function* ({ name, anchor: _anchor, subject }) {
            const registry = yield* Capability.get(Capabilities.AtomRegistry);
            const stateAtom = yield* Capability.get(ThreadCapabilities.State);
            const subjectId = Obj.getDXN(subject).toString();
            const thread = Thread.make({ name });
            const anchor = Relation.make(AnchoredTo.AnchoredTo, {
              [Relation.Source]: thread,
              [Relation.Target]: subject,
              anchor: _anchor,
            });

            const state = registry.get(stateAtom);
            const existingDrafts = state.drafts[subjectId];
            registry.set(stateAtom, {
              ...state,
              drafts: {
                ...state.drafts,
                [subjectId]: existingDrafts ? [...existingDrafts, anchor] : [anchor],
              },
            });

            // Follow-up operations.
            yield* Operation.invoke(ThreadOperation.Select, { current: Obj.getDXN(thread).toString() });
            yield* Operation.invoke(DeckOperation.ChangeCompanion, {
              companion: `${COMPANION_PREFIX}comments`,
            });
          }),
        }),

        //
        // Delete
        //
        OperationResolver.make({
          operation: ThreadOperation.Delete,
          handler: Effect.fnUntraced(function* ({ subject, anchor, thread: _thread }) {
            const registry = yield* Capability.get(Capabilities.AtomRegistry);
            const stateAtom = yield* Capability.get(ThreadCapabilities.State);
            const thread = _thread ?? (Relation.getSource(anchor) as Thread.Thread);
            const subjectId = Obj.getDXN(subject).toString();
            const state = registry.get(stateAtom);
            const draft = state.drafts[subjectId];
            if (draft) {
              // Check if we're deleting a draft; if so, remove it.
              const index = draft.findIndex((a: { id: string }) => a.id === anchor.id);
              if (index !== -1) {
                registry.set(stateAtom, {
                  ...state,
                  drafts: {
                    ...state.drafts,
                    [subjectId]: state.drafts[subjectId]?.filter((_, i) => i !== index),
                  },
                });
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
          handler: Effect.fnUntraced(function* ({ anchor, subject, sender, text }) {
            const registry = yield* Capability.get(Capabilities.AtomRegistry);
            const stateAtom = yield* Capability.get(ThreadCapabilities.State);
            const thread = Relation.getSource(anchor) as Thread.Thread;
            const subjectId = Obj.getDXN(subject).toString();
            const db = Obj.getDatabase(subject);
            invariant(db, 'Database not found');

            const message = Obj.make(Message.Message, {
              created: new Date().toISOString(),
              sender,
              blocks: [{ _tag: 'text', text }],
            });
            Obj.change(thread, (obj) => {
              obj.messages.push(Ref.make(message));
            });

            const state = registry.get(stateAtom);
            const draft = state.drafts[subjectId]?.find((a: { id: string }) => a.id === anchor.id);
            if (draft) {
              // Move draft to document.
              Obj.change(thread, (obj) => {
                obj.status = 'active';
              });
              registry.set(stateAtom, {
                ...state,
                drafts: {
                  ...state.drafts,
                  [subjectId]: state.drafts[subjectId]?.filter((a: { id: string }) => a.id !== anchor.id),
                },
              });
              yield* Operation.invoke(SpaceOperation.AddObject, { object: thread, target: db, hidden: true });
              yield* Operation.invoke(SpaceOperation.AddRelation, {
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
          }),
        }),

        //
        // DeleteMessage
        //
        OperationResolver.make({
          operation: ThreadOperation.DeleteMessage,
          handler: Effect.fnUntraced(function* ({ subject, anchor, messageId }) {
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
              yield* Operation.invoke(ThreadOperation.Delete, { subject, anchor });
              return { messageIndex: -1 };
            }

            Obj.change(thread, (obj) => {
              obj.messages.splice(msgIndex, 1);
            });

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
          }),
        }),

        //
        // Restore (inverse of Delete)
        //
        OperationResolver.make({
          operation: ThreadOperation.Restore,
          handler: Effect.fnUntraced(function* ({ thread, anchor }) {
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
          handler: Effect.fnUntraced(function* ({ anchor, message, messageIndex }) {
            const thread = Relation.getSource(anchor) as Thread.Thread;
            const db = Obj.getDatabase(thread);
            invariant(db, 'Database not found');

            Obj.change(thread, (obj) => {
              obj.messages.splice(messageIndex, 0, Ref.make(message));
            });

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
