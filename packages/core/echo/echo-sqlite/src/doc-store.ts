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
        query: { feedIds: missing },
      });
      const chunks = new Map<string, Uint8Array[]>();
      for (const block of blocks) {
        if (block.feedId !== undefined) {
          const list = chunks.get(block.feedId) ?? [];
          list.push(block.data);
          chunks.set(block.feedId, list);
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
   */
  write(objects: readonly { id: string; structure: EntityStructure }[]): Store<void> {
    return Effect.gen({ self: this }, function* () {
      const docs = yield* this.load(objects.map((object) => object.id));
      const messages: { spaceId: string; feedId: string; feedNamespace: string; data: Uint8Array }[] = [];
      const written = new Map<string, Doc>();
      for (const { id, structure } of objects) {
        const before = docs.get(id) ?? this.#create();
        const after = A.change(before, (doc) => {
          doc.objects ??= {};
          const existing = doc.objects[id];
          // `createdAt` is set once, by the first writer, and survives every later write.
          const createdAt = existing?.system?.createdAt ?? structure.system?.createdAt ?? Date.now();
          const next = { ...structure, system: { ...structure.system, createdAt } };
          applyValue(doc, ['objects'], doc.objects, id, next);
        });
        const chunk = A.saveIncremental(after);
        if (chunk.byteLength > 0) {
          messages.push({ spaceId: this.#spaceId, feedId: id, feedNamespace: AUTOMERGE_NAMESPACE, data: chunk });
        }
        written.set(id, after);
      }
      if (messages.length > 0) {
        yield* this.#feedStore.appendLocal(messages);
      }
      // Cached only once durable: a failed append leaves the cache at the stored state, so a retry
      // computes the same change again instead of finding nothing new to write.
      for (const [id, doc] of written) {
        this.#remember(id, doc);
      }
    });
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

  #create(): Doc {
    return A.change(A.init<DatabaseDirectory>(), (doc) => {
      doc.version = SpaceDocVersion.CURRENT;
      doc.access = { spaceId: this.#spaceId };
    });
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

const concat = (chunks: readonly Uint8Array[]): Uint8Array => {
  const out = new Uint8Array(chunks.reduce((size, chunk) => size + chunk.byteLength, 0));
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
};
