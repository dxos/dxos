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
      const { blocks } = yield* this.#feedStore.query({
        spaceId: this.#spaceId,
        feedNamespace: AUTOMERGE_NAMESPACE,
        query: { feedIds: missing.map(documentFeedId) },
      });
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
      for (const { id, structure, heads } of objects) {
        const stored = written.get(id) ?? docs.get(id);
        const before = stored ?? A.init<DatabaseDirectory>();
        const spaceId = this.#spaceId;
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
          const next = { ...structure, system: { ...structure.system, createdAt } };
          applyValue(doc, ['objects'], doc.objects, id, next);
        };
        const current = A.getHeads(before);
        const behind = heads !== undefined && heads.length > 0 && !sameHeads(heads, current);
        // Stamped with the time, which change history reports; a change without one reads as clockless.
        const options = { time: Math.floor(Date.now() / 1000) };
        const after = behind ? A.changeAt(before, [...heads], options, edit).newDoc : A.change(before, options, edit);
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
        this.#remember(id, doc);
      }
      return results;
    });
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
    // Marks the absorbed changes saved, so the next local chunk carries only the local edit.
    A.saveIncremental(doc);
    this.#remember(id, doc);
  }

  /**
   * Drops cached documents, so their next load reads every chunk again (after another writer appended
   * to them).
   */
  invalidate(ids: Iterable<string>): void {
    for (const id of ids) {
      this.#cache.delete(id);
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
      const oldest = this.#cache.keys().next().value;
      if (oldest !== undefined) {
        this.#cache.delete(oldest);
      }
    }
  }
}

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
