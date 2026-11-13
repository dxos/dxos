//
// Copyright 2026 DXOS.org
//

import * as A from '@automerge/automerge';
import * as Effect from 'effect/Effect';
import type * as SqlClient from 'effect/sql/SqlClient';
import type * as SqlError from 'effect/sql/SqlError';

import { type DatabaseDirectory, type EntityStructure, SpaceDocVersion } from '@dxos/echo-protocol';
import { type CypherError, type FeedStore } from '@dxos/feed';
import { type SpaceId } from '@dxos/keys';
import { FeedProtocol } from '@dxos/protocols';

import { applyValue } from './apply.ts';

/** The feed namespace whose feeds are objects' Automerge documents; one feed per object, keyed by its id. */
export const AUTOMERGE_NAMESPACE = FeedProtocol.WellKnownNamespaces.automerge;

export type Doc = A.Doc<DatabaseDirectory>;

/**
 * The feed holding an object's document. Prefixed, because the feed store keys feeds by id alone and a
 * `Feed` object's items already live in a feed named by the object's id.
 */
export const documentFeedId = (objectId: string): string => `doc:${objectId}`;

/** The object whose document a feed holds, or undefined for any other feed. */
export const objectOfFeed = (feedId: string): string | undefined =>
  feedId.startsWith('doc:') ? feedId.slice('doc:'.length) : undefined;

/** One object to write: its structure, and the heads of the document it was read at, if any. */
export type DocWrite = { id: string; structure: EntityStructure; heads?: readonly string[] };

/** The document's heads after a write, and whether it holds changes the written structure lacked. */
export type WriteResult = { heads: string[]; merged: boolean; updatedAt?: number };

type Store<T> = Effect.Effect<T, SqlError.SqlError | CypherError, SqlClient.SqlClient>;

/** Documents read per feed-store query, below the 100 bound variables Durable Object SQLite allows. */
const LOAD_BATCH = 80;

/** Upper bound on resident documents; a document is only needed to write its object, so the cache is small. */
const MAX_CACHED = 256;

/**
 * Objects' Automerge documents, stored as feeds of the `automerge` namespace: every write appends the
 * document's incremental chunk as one block, and a load concatenates all of a feed's chunks.
 */
export class DocStore {
  readonly #feedStore: FeedStore;
  readonly #spaceId: SpaceId;
  /** Least recently used first. */
  readonly #cache = new Map<string, Doc>();
  /** Documents edited in memory by {@link edit} whose changes no write has appended yet; never evicted. */
  readonly #unsaved = new Set<string>();

  constructor(feedStore: FeedStore, spaceId: SpaceId) {
    this.#feedStore = feedStore;
    this.#spaceId = spaceId;
  }

  /**
   * Loads the documents of `ids`; an id with no blocks has no document.
   */
  load(ids: readonly string[]): Store<Map<string, Doc>> {
    return Effect.gen({ self: this }, function* () {
      const docs = new Map<string, Doc>();
      const missing: string[] = [];
      for (const id of ids) {
        const cached = this.#touch(id);
        if (cached) {
          docs.set(id, cached);
        } else {
          missing.push(id);
        }
      }
      if (missing.length === 0) {
        return docs;
      }
      // Durable Object SQLite binds at most 100 variables per statement, so the feed ids go in batches.
      const blocks: FeedProtocol.Block[] = [];
      for (let start = 0; start < missing.length; start += LOAD_BATCH) {
        const result = yield* this.#feedStore.query({
          spaceId: this.#spaceId,
          feedNamespace: AUTOMERGE_NAMESPACE,
          query: { feedIds: missing.slice(start, start + LOAD_BATCH).map(documentFeedId) },
        });
        blocks.push(...result.blocks);
      }
      const chunks = new Map<string, Uint8Array[]>();
      for (const block of blocks) {
        const id = block.feedId === undefined ? undefined : objectOfFeed(block.feedId);
        if (id !== undefined) {
          const list = chunks.get(id) ?? [];
          list.push(block.data);
          chunks.set(id, list);
        }
      }
      for (const [id, list] of chunks) {
        const doc = A.load<DatabaseDirectory>(concat(list));
        this.#remember(id, doc);
        docs.set(id, doc);
      }
      return docs;
    });
  }

  /**
   * Writes each object's structure into its document and appends one chunk per changed document, in
   * one feed-store batch. Unchanged objects append nothing.
   *
   * An object with `heads` was read at those heads, so its structure is applied as an edit made there:
   * changes another writer made since merge with it instead of being overwritten. The result names
   * each object's new heads, and whether the document holds changes the written structure lacks.
   */
  write(objects: readonly DocWrite[]): Store<Map<string, WriteResult>> {
    return Effect.gen({ self: this }, function* () {
      const docs = yield* this.load(objects.map((object) => object.id));
      const messages: { spaceId: string; feedId: string; feedNamespace: string; data: Uint8Array }[] = [];
      const written = new Map<string, Doc>();
      const results = new Map<string, WriteResult>();
      for (const object of objects) {
        const { id } = object;
        const { after, behind } = editDocument(written.get(id) ?? docs.get(id), object, this.#spaceId);
        const chunk = A.saveIncremental(after);
        if (chunk.byteLength > 0) {
          messages.push({
            spaceId: this.#spaceId,
            feedId: documentFeedId(id),
            feedNamespace: AUTOMERGE_NAMESPACE,
            data: chunk,
          });
        }
        written.set(id, after);
        // An object written in several edits merged if any of them did.
        results.set(id, { heads: A.getHeads(after), merged: behind || (results.get(id)?.merged ?? false) });
      }
      if (messages.length > 0) {
        const blocks = yield* this.#feedStore.appendLocal(messages);
        for (const block of blocks) {
          const id = block.feedId === undefined ? undefined : objectOfFeed(block.feedId);
          const result = id === undefined ? undefined : results.get(id);
          if (result) {
            result.updatedAt = block.timestamp;
          }
        }
      }
      // Cached only once durable: a failed append leaves the cache at the stored state, so a retry
      // computes the same change again instead of finding nothing new to write.
      for (const [id, doc] of written) {
        this.#unsaved.delete(id);
        this.#remember(id, doc);
      }
      return results;
    });
  }

  /**
   * Applies writes to cached documents now, without appending: the next {@link write} of each object
   * appends these changes with its own. Undefined, changing nothing, when an object read at some heads
   * has no cached document to edit.
   */
  edit(objects: readonly DocWrite[]): Map<string, WriteResult> | undefined {
    if (objects.some((object) => !this.#cache.has(object.id) && (object.heads?.length ?? 0) > 0)) {
      return undefined;
    }
    const results = new Map<string, WriteResult>();
    for (const object of objects) {
      const { after, behind } = editDocument(this.#cache.get(object.id), object, this.#spaceId);
      this.#unsaved.add(object.id);
      this.#remember(object.id, after);
      results.set(object.id, { heads: A.getHeads(after), merged: behind || (results.get(object.id)?.merged ?? false) });
    }
    return results;
  }

  /**
   * Replaces each document's chunks with one full save, atomically, when it has more than one: loading
   * then reads one chunk instead of every write's. Documents with unsaved edits are left for their write.
   *
   * @returns The number of chunks deleted.
   */
  compact(ids: readonly string[]): Store<number> {
    return Effect.gen({ self: this }, function* () {
      const docs = yield* this.load(ids.filter((id) => !this.#unsaved.has(id)));
      let deleted = 0;
      for (const [id, doc] of docs) {
        const key = { spaceId: this.#spaceId, feedNamespace: AUTOMERGE_NAMESPACE, feedId: documentFeedId(id) };
        if ((yield* this.#feedStore.countBlocks(key)) <= 1) {
          continue;
        }
        const result = yield* this.#feedStore.appendReplacing({ ...key, data: A.save(doc) });
        deleted += result.deleted;
      }
      return deleted;
    });
  }

  /**
   * Changes a cached document's raw structure now, as one change the next {@link persist} (or write)
   * appends. False, changing nothing, when the document is not cached or the callback changed nothing.
   */
  change(id: string, callback: A.ChangeFn<DatabaseDirectory>): boolean {
    const before = this.#cache.get(id);
    if (!before) {
      return false;
    }
    const after = A.change(before, { time: Math.floor(Date.now() / 1000) }, callback);
    if (sameHeads(A.getHeads(before), A.getHeads(after))) {
      return false;
    }
    this.#unsaved.add(id);
    this.#remember(id, after);
    return true;
  }

  /**
   * Appends the changes made to documents in memory and not appended yet, one chunk per document.
   */
  persist(ids: readonly string[]): Store<void> {
    return Effect.gen({ self: this }, function* () {
      const messages = [...ids].flatMap((id) => {
        const doc = this.#unsaved.has(id) ? this.#cache.get(id) : undefined;
        const chunk = doc ? A.saveIncremental(doc) : undefined;
        return chunk && chunk.byteLength > 0
          ? [{ spaceId: this.#spaceId, feedId: documentFeedId(id), feedNamespace: AUTOMERGE_NAMESPACE, data: chunk }]
          : [];
      });
      if (messages.length > 0) {
        yield* this.#feedStore.appendLocal(messages);
      }
      for (const id of ids) {
        this.#unsaved.delete(id);
      }
    });
  }

  /** An object's cached document, without reading storage. */
  peek(id: string): Doc | undefined {
    return this.#cache.get(id);
  }

  /**
   * Applies blocks of a document, from any writer, to its cached copy; a chunk the copy already holds
   * changes nothing. A document not cached reads every block on its next load instead.
   */
  absorb(id: string, chunks: readonly Uint8Array[]): void {
    let doc = this.#cache.get(id);
    if (!doc) {
      return;
    }
    for (const chunk of chunks) {
      doc = A.loadIncremental(doc, chunk);
    }
    // Marks the absorbed changes saved, so the next local chunk carries only the local edit; an unsaved
    // document keeps them, since marking would drop its own edits from that chunk.
    if (!this.#unsaved.has(id)) {
      A.saveIncremental(doc);
    }
    this.#remember(id, doc);
  }

  /**
   * Drops cached documents, so their next load reads every chunk again (after another writer appended
   * to them).
   */
  invalidate(ids: Iterable<string>): void {
    for (const id of ids) {
      // An unsaved document holds the only copy of its edits; its next write merges what was appended.
      if (!this.#unsaved.has(id)) {
        this.#cache.delete(id);
      }
    }
  }

  #touch(id: string): Doc | undefined {
    const doc = this.#cache.get(id);
    if (doc) {
      this.#cache.delete(id);
      this.#cache.set(id, doc);
    }
    return doc;
  }

  #remember(id: string, doc: Doc): void {
    this.#cache.delete(id);
    this.#cache.set(id, doc);
    if (this.#cache.size > MAX_CACHED) {
      for (const oldest of this.#cache.keys()) {
        if (!this.#unsaved.has(oldest)) {
          this.#cache.delete(oldest);
          break;
        }
      }
    }
  }
}

/**
 * Writes an object's structure into its document as one change, made at the heads it was read at when
 * the document has moved past them, so concurrent changes merge with it.
 */
const editDocument = (stored: Doc | undefined, write: DocWrite, spaceId: SpaceId): { after: Doc; behind: boolean } => {
  const { id, structure, heads } = write;
  const before = stored ?? A.init<DatabaseDirectory>();
  const edit = (doc: DatabaseDirectory) => {
    if (!stored) {
      // A new document's header goes in the object's first change: one change per new object.
      doc.version = SpaceDocVersion.CURRENT;
      doc.access = { spaceId };
    }
    doc.objects ??= {};
    const existing = doc.objects[id];
    // `createdAt` is set once, by the first writer, and survives every later write.
    const createdAt = existing?.system?.createdAt ?? structure.system?.createdAt ?? Date.now();
    // The merge records are written by the convergence-key merge, not by objects, so a write keeps them.
    const merge = {
      ...(existing?.system?.mergedInto !== undefined && { mergedInto: existing.system.mergedInto }),
      ...(existing?.system?.mergedAtHeads !== undefined && { mergedAtHeads: [...existing.system.mergedAtHeads] }),
      ...(existing?.system?.mergedFrom !== undefined && { mergedFrom: [...existing.system.mergedFrom] }),
    };
    const next = { ...structure, system: { ...merge, ...structure.system, createdAt } };
    applyValue(doc, ['objects'], doc.objects, id, next);
  };
  const behind = heads !== undefined && heads.length > 0 && !sameHeads(heads, A.getHeads(before));
  // Stamped with the time, which change history reports; a change without one reads as clockless.
  const options = { time: Math.floor(Date.now() / 1000) };
  const after = behind ? A.changeAt(before, [...heads], options, edit).newDoc : A.change(before, options, edit);
  return { after, behind };
};

const sameHeads = (left: readonly string[], right: readonly string[]): boolean =>
  left.length === right.length && left.every((head) => right.includes(head));

const concat = (chunks: readonly Uint8Array[]): Uint8Array => {
  const out = new Uint8Array(chunks.reduce((size, chunk) => size + chunk.byteLength, 0));
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
};
