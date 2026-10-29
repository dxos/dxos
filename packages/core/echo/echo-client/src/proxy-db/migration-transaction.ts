//
// Copyright 2026 DXOS.org
//

import { next as A, type Doc } from '@automerge/automerge';
import { isValidAutomergeUrl } from '@automerge/automerge-repo';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Error as EchoError, type Migration, type Obj } from '@dxos/echo';
import {
  type DatabaseDirectory,
  EncodedReference,
  type EntityMeta,
  type EntityStructure,
  SpaceDocVersion,
} from '@dxos/echo-protocol';
import {
  ATTR_DELETED,
  ATTR_META,
  ATTR_PARENT,
  ATTR_RELATION_SOURCE,
  ATTR_RELATION_TARGET,
  ATTR_TYPE,
  type EntityMetaJSON,
} from '@dxos/echo/internal';
import { assertArgument, invariant } from '@dxos/invariant';
import { EID, type EntityId } from '@dxos/keys';

import { type DocHandleProxy, type RepoProxy } from '../automerge/index.ts';
import { type ObjectCore } from '../core-db/index.ts';
import { createObject, getObjectCore, isEchoObject } from '../echo-handler/index.ts';
import { migrateDocument } from '../util/migrate-document.ts';

/** What a {@link MigrationTransaction} needs from the database it migrates. */
export type MigrationTransactionProps = {
  repo: RepoProxy;
  /** The current space root document. */
  rootHandle: DocHandleProxy<DatabaseDirectory>;
  access: NonNullable<DatabaseDirectory['access']>;
  /** Persists writes made outside the transaction before the root changes. */
  flush: () => Promise<void>;
  /** Starts a new space epoch whose root is the given document; required for `root: 'replace'`. */
  createEpoch?: (rootUrl: string) => Promise<void>;
  options: Migration.TransactionOptions;
};

type StagedChange = {
  /** New state of the object; absent when only compaction or deletion is staged. */
  structure?: EntityStructure;
  compact?: boolean;
  deleted?: boolean;
};

/**
 * Implements {@link Migration.Transaction}: stages changes in memory and writes them only on commit,
 * so an abandoned transaction leaves no documents behind.
 */
export class MigrationTransaction implements Migration.Transaction {
  readonly #props: MigrationTransactionProps;
  readonly #changes = new Map<EntityId, StagedChange>();
  #committed = false;

  constructor(props: MigrationTransactionProps) {
    this.#props = props;
  }

  get(id: EntityId): Effect.Effect<Option.Option<Obj.JSON>, EchoError.MigrationError> {
    return Effect.tryPromise({
      try: () => this.#get(id),
      catch: (cause) => new EchoError.MigrationError({ operation: 'get', id }, { cause }),
    }).pipe(Effect.map(Option.fromNullishOr));
  }

  add(object: Obj.Unknown): void {
    this.#assertOpen();
    assertArgument(!this.#isStored(object.id), 'object', `Object already stored: ${object.id}`);
    this.#stage(object);
  }

  replace(object: Obj.Unknown): void {
    this.#assertOpen();
    assertArgument(this.#isStored(object.id), 'object', `Object not stored: ${object.id}`);
    this.#stage(object);
  }

  migrate<E = never, R = never>(
    id: EntityId,
    transform: (current: Obj.JSON) => Obj.Unknown | Effect.Effect<Obj.Unknown, E, R>,
  ): Effect.Effect<boolean, E | EchoError.MigrationError, R> {
    const self = this;
    return Effect.gen(function* () {
      const current = yield* self.get(id);
      if (Option.isNone(current)) {
        return false;
      }
      const result = transform(current.value);
      const next = Effect.isEffect(result) ? yield* result : result;
      invariant(next.id === id, 'Migrated object must keep its id.');
      self.#stage(next);
      return true;
    });
  }

  delete(id: EntityId): void {
    this.#assertOpen();
    this.#changes.set(id, { deleted: true });
  }

  compact(ids?: readonly EntityId[]): Migration.CompactResult {
    this.#assertOpen();
    const links = this.#root().links ?? {};
    const compacted: EntityId[] = [];
    const skipped: EntityId[] = [];
    for (const id of ids ?? Object.keys(links)) {
      if (links[id] == null || this.#changes.get(id)?.deleted) {
        skipped.push(id);
        continue;
      }
      this.#changes.set(id, { ...this.#changes.get(id), compact: true });
      compacted.push(id);
    }
    return { compacted, skipped };
  }

  commit(): Effect.Effect<void, EchoError.MigrationError> {
    return Effect.tryPromise({
      try: () => this.#commit(),
      catch: (cause) => new EchoError.MigrationError({ operation: 'commit' }, { cause }),
    });
  }

  async #get(id: EntityId): Promise<Obj.JSON | undefined> {
    this.#assertOpen();
    const change = this.#changes.get(id);
    if (change?.deleted) {
      return undefined;
    }
    const structure = change?.structure ?? (await this.#readStored(id));
    return structure && toObjectJSON(id, structure);
  }

  async #commit(): Promise<void> {
    this.#assertOpen();
    this.#committed = true;

    // Persist writes made outside the transaction first, so the root read below includes them.
    await this.#props.flush();
    const root = this.#root();
    const objects = new Map<EntityId, EntityStructure | undefined>();
    const links = new Map<EntityId, string | undefined>();
    for (const [id, change] of this.#changes) {
      if (change.deleted) {
        objects.set(id, undefined);
        links.set(id, undefined);
        continue;
      }

      const link = root.links?.[id]?.toString();
      if (link == null) {
        const inline = root.objects?.[id];
        if (inline != null) {
          // Inline objects live in the root itself; compaction does not apply.
          if (change.structure) {
            objects.set(id, withStoredSystem(change.structure, inline));
          }
        } else {
          invariant(change.structure);
          links.set(id, await this.#createDocument({ [id]: change.structure }));
        }
        continue;
      }

      const handle = await this.#find(link);
      const doc = handle.doc();
      invariant(doc, `Document not available: ${link}`);
      const structure = change.structure && withStoredSystem(change.structure, doc.objects?.[id]);
      if (change.compact) {
        links.set(id, await this.#createDocument(structure ? { [id]: structure } : { ...A.toJS(doc).objects }));
      } else {
        invariant(structure);
        const migrated = migrateDocument(doc, this.#directory({ [id]: structure }));
        const migratedHandle = this.#props.repo.import<DatabaseDirectory>(A.save(migrated));
        await migratedHandle.whenReady();
        invariant(migratedHandle.url, 'Migrated document URL not available.');
        links.set(id, migratedHandle.url);
      }
    }

    if (this.#props.options.root === 'update') {
      this.#props.rootHandle.change((doc: DatabaseDirectory) => {
        applyChanges(doc, objects, links);
      });
      await this.#props.flush();
      return;
    }

    const createEpoch = this.#props.createEpoch;
    invariant(createEpoch, 'Database cannot create epochs.');
    // Branches and retired documents are synced state the new root must carry over.
    const { branches, retired } = A.toJS(root);
    const next: DatabaseDirectory = {
      ...this.#directory({ ...root.objects }),
      links: { ...root.links },
      ...(branches != null && { branches }),
      ...(retired != null && { retired }),
    };
    applyChanges(next, objects, links);
    const rootHandle = this.#props.repo.create<DatabaseDirectory>(next);
    await rootHandle.whenReady();
    invariant(rootHandle.url, 'Root document URL not available.');
    await createEpoch(rootHandle.url);
  }

  #assertOpen(): void {
    invariant(!this.#committed, 'Migration transaction already committed.');
  }

  #root(): Doc<DatabaseDirectory> {
    const root = this.#props.rootHandle.doc();
    invariant(root, 'Space root document not available.');
    return root;
  }

  #isStored(id: EntityId): boolean {
    const { links, objects } = this.#root();
    return links?.[id] != null || objects?.[id] != null;
  }

  /** Stages the object and every unstored object it references. */
  #stage(object: Obj.Unknown): void {
    assertArgument(!isEchoObject(object), 'object', 'Pass a new object made with Obj.make, not a database object.');
    // Converting the object into an ECHO object is what encodes its data into the stored form.
    const core = getObjectCore(createObject(object));
    this.#stageCore(core);
  }

  #stageCore(core: ObjectCore): void {
    // An object not bound to a database holds its state in a local document.
    invariant(core.doc, 'Object is bound to a database.');
    const change = this.#changes.get(core.id);
    this.#changes.set(core.id, { compact: change?.compact, structure: A.toJS(core.doc) });
    for (const linked of core.linkCache?.values() ?? []) {
      if (!this.#changes.has(linked.id) && !this.#isStored(linked.id)) {
        this.#stageCore(getObjectCore(linked));
      }
    }
  }

  async #readStored(id: EntityId): Promise<EntityStructure | undefined> {
    const { links, objects } = this.#root();
    const link = links?.[id]?.toString();
    if (link == null) {
      return objects?.[id];
    }
    const handle = await this.#find(link);
    return handle.doc()?.objects?.[id];
  }

  async #find(url: string): Promise<DocHandleProxy<DatabaseDirectory>> {
    invariant(isValidAutomergeUrl(url), `Invalid document URL: ${url}`);
    const handle = this.#props.repo.find<DatabaseDirectory>(url);
    await handle.whenReady();
    return handle;
  }

  async #createDocument(objects: Record<string, EntityStructure>): Promise<string> {
    const handle = this.#props.repo.create<DatabaseDirectory>(this.#directory(objects));
    await handle.whenReady();
    invariant(handle.url, 'Document URL not available.');
    return handle.url;
  }

  #directory(objects: Record<string, EntityStructure>): DatabaseDirectory {
    return { version: SpaceDocVersion.CURRENT, access: this.#props.access, objects };
  }
}

/** Writes staged objects and links into a root; `undefined` removes the entry. */
const applyChanges = (
  doc: DatabaseDirectory,
  objects: ReadonlyMap<EntityId, EntityStructure | undefined>,
  links: ReadonlyMap<EntityId, string | undefined>,
): void => {
  for (const [id, structure] of objects) {
    if (structure) {
      doc.objects ??= {};
      doc.objects[id] = structure;
    } else if (doc.objects) {
      delete doc.objects[id];
    }
  }
  for (const [id, url] of links) {
    if (url) {
      doc.links ??= {};
      doc.links[id] = new A.RawString(url);
    } else if (doc.links) {
      delete doc.links[id];
    }
  }
};

/** Keeps the stored creation time: a migrated object was not created by the migration. */
const withStoredSystem = (structure: EntityStructure, stored: EntityStructure | undefined): EntityStructure => {
  const createdAt = stored?.system?.createdAt;
  return createdAt == null ? structure : { ...structure, system: { ...structure.system, createdAt } };
};

const toObjectJSON = (id: EntityId, structure: EntityStructure): Obj.JSON => {
  const { system, meta, data } = structure;
  const json: Obj.JSON = { ...data, id, [ATTR_META]: toMetaJSON(meta) };
  if (system?.type) {
    json[ATTR_TYPE] = EncodedReference.toURI(system.type);
  }
  if (system?.deleted) {
    json[ATTR_DELETED] = true;
  }
  const parent = system?.parent && EID.tryParse(EncodedReference.toURI(system.parent));
  if (parent) {
    json[ATTR_PARENT] = parent;
  }
  const source = system?.source && EID.tryParse(EncodedReference.toURI(system.source));
  if (source) {
    json[ATTR_RELATION_SOURCE] = source;
  }
  const target = system?.target && EID.tryParse(EncodedReference.toURI(system.target));
  if (target) {
    json[ATTR_RELATION_TARGET] = target;
  }
  return json;
};

const toMetaJSON = ({ keys, tags, key, version, annotations }: EntityMeta): EntityMetaJSON => ({
  keys: keys ?? [],
  ...(tags?.length ? { tags: tags.map((tag) => (typeof tag === 'string' ? tag : EncodedReference.toURI(tag))) } : {}),
  ...(key != null ? { key } : {}),
  ...(version != null ? { version } : {}),
  ...(annotations != null ? { annotations } : {}),
});
