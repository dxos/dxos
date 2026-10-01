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
import { type DatabaseDirectory } from '@dxos/echo-protocol';
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
// of its documents, its registry entries or the space's lenses changed since it was last synced; the first
// pass after startup syncs every versioned object, so nothing a crashed pass left undone is lost.
//

export type VersionTranslatorDeps = {
  spaceIds: () => readonly SpaceId[];
  rootDocumentId: (spaceId: SpaceId) => DocumentId | undefined;
  /** Every indexed object of type `typeDXN` in the space, one row per document holding it. */
  queryType: (spaceId: SpaceId, typeDXN: URI.URI) => Promise<readonly { objectId: string; documentId: string }[]>;
  loadDoc: (ctx: Context, documentId: DocumentId) => Promise<DocumentLease<DatabaseDirectory> | null>;
  /** Stores `doc`, history included, as a new document. */
  createDoc: (doc: Doc<DatabaseDirectory>) => Promise<DocumentLease<DatabaseDirectory>>;
  /** The indexed objects referencing `objectId`, so copies of one absorbed object exchange edits. */
  queryReferrers?: (spaceId: SpaceId, objectId: EntityId) => Promise<readonly { objectId: string }[]>;
};

const LENS_TYPE = Type.getURI(Lens.Stored);

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

export class VersionTranslator {
  readonly #deps: VersionTranslatorDeps;
  /** Per space: what each object looked like when it was last synced. */
  readonly #synced = new Map<SpaceId, Map<string, string>>();
  readonly #settled = new Map<SpaceId, VersionSettled>();
  /** Per space: documents outside an object's own that its last sync read, such as the objects extracted from it. */
  readonly #related = new Map<SpaceId, Map<string, Set<string>>>();
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
      const loaded = await this.#deps.loadDoc(ctx, documentId);
      if (!loaded) {
        throw new Error(`document unavailable: ${documentId}`);
      }
      leases.push(loaded);
      return loaded;
    };
    try {
      const edges: Lens.VersionEdge[] = [];
      for (const { objectId, documentId } of await this.#deps.queryType(spaceId, LENS_TYPE)) {
        if (!isValidDocumentId(documentId)) {
          continue;
        }
        const stored = (await lease(documentId)).doc().objects?.[objectId]?.data;
        const edge = Lens.storedVersionEdge(stored);
        if (edge) {
          edges.push(edge);
        }
      }

      if (edges.length === 0) {
        return;
      }
      const lensesKey = edges
        .map((edge) => edge.digest)
        .sort()
        .join('\n');
      const objectIds = new Set<string>();
      for (const type of new Set(edges.flatMap((edge) => [edge.source, edge.target]))) {
        for (const { objectId } of await this.#deps.queryType(spaceId, type)) {
          objectIds.add(objectId);
        }
      }

      const root = await lease(rootId);
      const store: VersionStore = {
        root,
        load: async (url) => {
          if (!isValidAutomergeUrl(url)) {
            throw new TypeError(`not a document url: ${url}`);
          }
          return lease(interpretAsDocumentId(url));
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
      const related = this.#related.get(spaceId) ?? new Map<string, Set<string>>();
      this.#related.set(spaceId, related);
      // Heads of the documents themselves: stored heads can lag a document that is loaded and changing.
      const stateOf = async (objectId: string): Promise<string> => {
        const parts = [lensesKey];
        for (const url of new Set([...documentsOf(root.doc(), objectId), ...(related.get(objectId) ?? [])])) {
          parts.push(`${url}:${A.getHeads((await store.load(url)).doc()).join(',')}`);
        }
        return parts.join('\n');
      };
      for (const objectId of objectIds) {
        if (ctx.disposed) {
          return;
        }
        const before = await stateOf(objectId);
        if (synced.get(objectId) === before) {
          continue;
        }
        const touched = new Set<string>();
        await syncVersionDocuments(store, edges, [objectId], {
          settled,
          onHandle: (_, handle) => handle.url && touched.add(handle.url),
        });
        related.set(objectId, touched);
        synced.set(objectId, await stateOf(objectId));
      }
    } finally {
      for (const held of leases) {
        held[Symbol.dispose]();
      }
    }
  }
}
