//
// Copyright 2026 DXOS.org
//

import { next as A, type Doc } from '@automerge/automerge';
import {
  type AutomergeUrl,
  type DocumentId,
  interpretAsDocumentId,
  isValidAutomergeUrl,
  isValidDocumentId,
} from '@automerge/automerge-repo';

import { type Context } from '@dxos/context';
import { Lens, Type } from '@dxos/echo';
import { type DatabaseDirectory, EntityStructure } from '@dxos/echo-protocol';
import { EntityId, type SpaceId, type URI } from '@dxos/keys';
import { log } from '@dxos/log';

import { type DocumentLease } from '../automerge/index.ts';
import { type VersionSettled, type VersionStore, syncVersionDocuments } from '../versions/index.ts';

//
// The host keeps every version document of every versioned object in sync (DESIGN.md §12.7, decision 6),
// with the declarative lenses stored in each space: translation needs only the stored lenses and the
// documents, so it runs once per device, whether or not a client has the space open.
//
// It runs after each index pass, as convergence-key merging does. An object is synced again only when one
// of the documents or links its last sync read, its registry entries or the space's lenses changed since; an
// object whose sync failed is retried on the next pass. The first pass after startup syncs every versioned
// object, so nothing a crashed pass left undone is lost.
//

export type VersionTranslatorDeps = {
  spaceIds: () => readonly SpaceId[];
  rootDocumentId: (spaceId: SpaceId) => DocumentId | undefined;
  /** Every indexed object of type `typeDXN` in the space, one row per document holding it. */
  queryType: (spaceId: SpaceId, typeDXN: URI.URI) => Promise<readonly { objectId: string; documentId: string }[]>;
  loadDoc: (
    ctx: Context,
    documentId: DocumentId,
    opts: { timeout: number; fetchFromNetwork: boolean },
  ) => Promise<DocumentLease<DatabaseDirectory> | null>;
  /** Stores `doc`, history included, as a new document. */
  createDoc: (doc: Doc<DatabaseDirectory>) => Promise<DocumentLease<DatabaseDirectory>>;
  /** The indexed objects referencing `objectId`, so copies of one absorbed object exchange edits. */
  queryReferrers?: (spaceId: SpaceId, objectId: EntityId) => Promise<readonly { objectId: string }[]>;
};

const LENS_TYPE = Type.getURI(Lens.Stored);

/**
 * Documents are read from local storage only: a document no peer has delivered yet arrives through space
 * replication, whose index pass runs the translator again, and waiting on the network here would hold back
 * every other space. The timeout bounds the local load itself.
 */
const LOAD_OPTIONS = { fetchFromNetwork: false, timeout: 10_000 };

/** What an object's sync read beyond its own documents. */
type Related = { urls: Set<string>; links: Set<string> };

/** The documents holding any version of `objectId`, on main or on a branch. */
const documentsOf = (root: DatabaseDirectory, objectId: string): AutomergeUrl[] => {
  const urls = new Set<string>();
  const linked = root.links?.[objectId];
  if (linked) {
    urls.add(linked.toString());
  }
  for (const byName of Object.values(root.branches ?? {})) {
    for (const record of Object.values(byName)) {
      const member = record.members?.[objectId];
      if (member) {
        urls.add(member.toString());
      }
      for (const url of Object.values(record.versions?.[objectId] ?? {})) {
        urls.add(url.toString());
      }
    }
  }
  return [...urls].filter((url): url is AutomergeUrl => isValidAutomergeUrl(url));
};

/**
 * Keeps the version documents of every space's versioned objects in sync with the space's stored lenses,
 * one pass at a time.
 */
export class VersionTranslator {
  readonly #deps: VersionTranslatorDeps;
  /** Per space: what each object looked like when it was last synced. */
  readonly #synced = new Map<SpaceId, Map<string, string>>();
  readonly #settled = new Map<SpaceId, VersionSettled>();
  /** Per space: documents and links outside an object's own that its last sync read, such as the objects extracted from it. */
  readonly #related = new Map<SpaceId, Map<string, Related>>();
  #running: Promise<void> | undefined;
  #again = false;

  constructor(deps: VersionTranslatorDeps) {
    this.#deps = deps;
  }

  /** Runs a pass, or another once the running one ends; resolves when no pass is pending. */
  async schedule(ctx: Context): Promise<void> {
    if (this.#running) {
      this.#again = true;
      return this.#running;
    }
    this.#running = (async () => {
      try {
        do {
          this.#again = false;
          await this.#run(ctx);
        } while (this.#again && !ctx.disposed);
      } finally {
        this.#running = undefined;
      }
    })();
    return this.#running;
  }

  async #run(ctx: Context): Promise<void> {
    for (const spaceId of this.#deps.spaceIds()) {
      if (ctx.disposed) {
        return;
      }
      try {
        await this.#runSpace(ctx, spaceId);
      } catch (err) {
        log.warn('version documents: could not sync space', { spaceId, err });
      }
    }
  }

  async #runSpace(ctx: Context, spaceId: SpaceId): Promise<void> {
    const rootId = this.#deps.rootDocumentId(spaceId);
    if (!rootId) {
      return;
    }
    const leases: Disposable[] = [];
    const lease = async (documentId: DocumentId): Promise<DocumentLease<DatabaseDirectory>> => {
      const loaded = await this.#deps.loadDoc(ctx, documentId, LOAD_OPTIONS);
      if (!loaded) {
        throw new Error(`document unavailable: ${documentId}`);
      }
      leases.push(loaded);
      return loaded;
    };
    try {
      const byDigest = new Map<string, Lens.VersionEdge>();
      for (const { objectId, documentId } of await this.#deps.queryType(spaceId, LENS_TYPE)) {
        if (!isValidDocumentId(documentId)) {
          continue;
        }
        const entity = (await lease(documentId)).doc().objects?.[objectId];
        const edge = entity && !EntityStructure.isDeleted(entity) ? Lens.storedVersionEdge(entity.data) : undefined;
        if (edge) {
          byDigest.set(edge.digest, edge);
        }
      }
      const edges = [...byDigest.values()];
      if (edges.length === 0) {
        return;
      }
      const lensesKey = [...byDigest.keys()].sort().join('\n');
      const objectIds = new Set<string>();
      for (const type of new Set(edges.flatMap((edge) => [edge.source, edge.target]))) {
        for (const { objectId } of await this.#deps.queryType(spaceId, type)) {
          objectIds.add(objectId);
        }
      }

      const root = await lease(rootId);
      // What the object being synced reads beyond its own documents.
      let reading: Related | undefined;
      const store: VersionStore = {
        root,
        load: async (url) => {
          if (!isValidAutomergeUrl(url)) {
            throw new TypeError(`not a document url: ${url}`);
          }
          reading?.urls.add(url);
          return lease(interpretAsDocumentId(url));
        },
        link: (objectId) => {
          reading?.links.add(objectId);
          return root.doc().links?.[objectId]?.toString();
        },
        create: async (doc) => {
          const created = await this.#deps.createDoc(doc);
          leases.push(created);
          return created;
        },
        referrers: async (objectId) => {
          const queryReferrers = this.#deps.queryReferrers;
          return queryReferrers && EntityId.isValid(objectId)
            ? (await queryReferrers(spaceId, objectId)).map((referrer) => referrer.objectId)
            : [];
        },
      };
      const synced = this.#synced.get(spaceId) ?? new Map<string, string>();
      this.#synced.set(spaceId, synced);
      const settled = this.#settled.get(spaceId) ?? new Map();
      this.#settled.set(spaceId, settled);
      const related = this.#related.get(spaceId) ?? new Map<string, Related>();
      this.#related.set(spaceId, related);
      // Live heads, since stored heads lag a loaded document; a link found missing counts, so a later arrival re-syncs.
      const stateOf = async (objectId: string): Promise<string> => {
        const read = related.get(objectId);
        const parts = [lensesKey];
        for (const linked of [...(read?.links ?? [])].sort()) {
          parts.push(`${linked}->${root.doc().links?.[linked]?.toString() ?? ''}`);
        }
        for (const url of new Set([...documentsOf(root.doc(), objectId), ...(read?.urls ?? [])])) {
          parts.push(`${url}:${A.getHeads((await store.load(url)).doc()).join(',')}`);
        }
        return parts.join('\n');
      };
      for (const objectId of objectIds) {
        if (ctx.disposed) {
          return;
        }
        // A document of one object that is not available yet holds back only that object.
        try {
          const before = await stateOf(objectId);
          if (synced.get(objectId) === before) {
            continue;
          }
          const read: Related = { urls: new Set(), links: new Set() };
          reading = read;
          const failed = await syncVersionDocuments(store, edges, [objectId], {
            settled,
            onHandle: (_, handle) => handle.url && read.urls.add(handle.url),
          });
          reading = undefined;
          related.set(objectId, read);
          if (failed.length > 0) {
            synced.delete(objectId);
            continue;
          }
          // The state read before the pass: one read after may hold edits that landed mid-pass, unread.
          synced.set(objectId, before);
        } catch (err) {
          reading = undefined;
          synced.delete(objectId);
          log.warn('version documents: could not sync object', { objectId, err });
        }
      }
    } finally {
      for (const held of leases) {
        held[Symbol.dispose]();
      }
    }
  }
}
