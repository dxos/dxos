//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation } from '@dxos/echo/Annotation';
import { EID, type EntityId } from '@dxos/keys';
import { Message } from '@dxos/types';

/**
 * The entity id a message ref points at. Compares by id (not raw uri or `Ref.hasEntityId`): a stored
 * ref reads back as an absolute EID (`echo://<space>/<id>`) while a freshly made one is local
 * (`echo:/<id>`), so uri-string equality and the local-only `Ref.hasEntityId` both miss.
 */
const refEntityId = (ref: Ref.Ref<Message.Message>): EntityId | undefined => {
  const uri = EID.tryParse(ref.uri);
  return uri !== undefined ? EID.getEntityId(uri) : undefined;
};

/**
 * A conversation index: a standalone object holding a `Record<threadId, Ref<Message>[]>` mapping a
 * provider thread id to references to the messages that belong to that thread.
 *
 * Messages are immutable feed/queue items and cannot carry their own thread membership, so this
 * index — referenced from the mailbox as a child (see {@link Obj.setParent}) — records it for them.
 * Members are stored as {@link Ref}s (not ids) so the thread detail view resolves them directly via
 * ref resolution rather than scanning the whole feed. The grouping key is the provider `threadId`
 * carried on each {@link Message.Message}.
 */
export class ThreadIndex extends Type.makeObject<ThreadIndex>(DXN.make('org.dxos.type.threadIndex', '0.1.0'))(
  Schema.Struct({
    /** Conversation index keyed by provider thread id; the value is the messages in that thread. */
    index: Schema.Record({ key: Schema.String, value: Schema.Array(Ref.Ref(Message.Message)) }).pipe(
      FormInputAnnotation.set(false),
    ),
  }).pipe(Annotation.HiddenAnnotation.set(true)),
) {}

/** Creates an empty ThreadIndex object. */
export const make = (): ThreadIndex => Obj.make(ThreadIndex, { index: {} });

/** Checks if a value is a ThreadIndex object. */
export const instanceOf = (value: unknown): value is ThreadIndex => Obj.instanceOf(ThreadIndex, value);

/** One message to record under a thread, as passed to {@link Accessor.addBatch}. */
export type ThreadEntry = { readonly threadId: string; readonly message: Message.Message };

/** Read/write accessor over a {@link ThreadIndex} object. */
export interface Accessor {
  /** All thread ids present in the index. */
  threadIds(): string[];
  /** Message references in the given thread; `[]` when the thread is absent. */
  messages(threadId: string): readonly Ref.Ref<Message.Message>[];
  /** Adds a message to a thread (creating the thread entry when absent); idempotent by message id. */
  add(threadId: string, message: Message.Message): void;
  /**
   * Adds many messages in one transaction: a single `Obj.update` and a single thread-id existence
   * snapshot for the whole batch, instead of one of each per entry (see {@link add}). Use for a
   * sync page's worth of messages rather than calling {@link add} in a loop — the existence check
   * would otherwise re-enumerate every thread id in the index once per message (O(#threads) per
   * message, O(#threads × page size) per page), which dominates commit time as the conversation
   * count grows. Idempotent per entry, same as {@link add}.
   */
  addBatch(entries: readonly ThreadEntry[]): void;
  /** Removes a message from a thread, pruning the thread entry when it empties. No-op when absent. */
  remove(threadId: string, messageId: EntityId): void;
}

/** Binds an {@link Accessor} over a {@link ThreadIndex} object; all mutations go through `Obj.update`. */
export const bind = (threadIndex: ThreadIndex): Accessor => {
  const read = (): ThreadIndex['index'] => threadIndex.index ?? {};

  // Mutate the live typed record in place (do NOT reassign the whole tree); assigning a detached
  // plain object tree bypasses ECHO's schema-aware conversion and stores arrays as numeric-keyed
  // objects. Mutating the typed proxy (and assigning real arrays to its values) preserves arrays.
  const write = (mutate: (index: Record<string, Ref.Ref<Message.Message>[]>) => void): void => {
    Obj.update(threadIndex, (threadIndex) => {
      if (threadIndex.index === undefined) {
        threadIndex.index = {};
      }
      mutate(threadIndex.index);
    });
  };

  // Thread-id set, snapshotted lazily via `Object.keys` (ECHO's reactive record proxy auto-vivifies
  // missing keys on direct access, so `index[threadId]` is not reliably `undefined` for absent
  // threads) and then maintained in place. Caching it on the accessor is what makes a run that calls
  // `addBatch` per page pay the O(#threads) enumeration ONCE, not once per page (which reintroduced
  // O(#threads × pages) = O(n²) as the conversation count grew). Sound because a single accessor is
  // the sole writer for its lifetime — sync runs are single-flight, and readers don't share it.
  let knownIds: Set<string> | undefined;
  const ensureKnown = (index: ThreadIndex['index']): Set<string> => (knownIds ??= new Set(Object.keys(index)));

  const addBatch: Accessor['addBatch'] = (entries) => {
    if (entries.length === 0) {
      return;
    }
    write((index) => {
      const known = ensureKnown(index);
      for (const { threadId, message } of entries) {
        if (!known.has(threadId)) {
          index[threadId] = [Ref.make(message)];
          known.add(threadId);
        } else if (!index[threadId].some((ref) => refEntityId(ref) === message.id)) {
          // push() mutates in place → O(1) Automerge op (list insert).
          // spread-replace would emit O(n) ops per call → quadratic history (DX-984).
          index[threadId].push(Ref.make(message));
        }
      }
    });
  };

  return {
    threadIds: () => Object.keys(read()),
    messages: (threadId) => {
      const index = read();
      return ensureKnown(index).has(threadId) ? index[threadId] : [];
    },
    add: (threadId, message) => addBatch([{ threadId, message }]),
    addBatch,
    remove: (threadId, messageId) =>
      write((index) => {
        if (!ensureKnown(index).has(threadId)) {
          return;
        }
        const at = index[threadId].findIndex((ref) => refEntityId(ref) === messageId);
        if (at === -1) {
          return;
        }
        // splice() removes in place → O(1) Automerge op (list delete).
        // filter-replace would emit O(n) ops per call → quadratic history (DX-984).
        index[threadId].splice(at, 1);
        if (index[threadId].length === 0) {
          delete index[threadId];
          knownIds?.delete(threadId);
        }
      }),
  };
};
