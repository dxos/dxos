//
// Copyright 2024 DXOS.org
//

import {
  next as A,
  type Doc as AutomergeDoc,
  type ChangeFn,
  type ChangeOptions,
  type Heads,
} from '@automerge/automerge';
import { type DocHandleChangePayload } from '@automerge/automerge-repo';
import * as Schema from 'effect/Schema';
import type { InspectOptionsStylized, inspect } from 'util';

import { type CleanupFn, Event } from '@dxos/async';
import { inspectCustom } from '@dxos/debug';
import { type Entity, type Type } from '@dxos/echo';
import {
  type DatabaseDirectory,
  EncodedReference,
  type EntityStructure,
  isEncodedReference,
} from '@dxos/echo-protocol';
import { EntityKind, type EntityMeta, getStrongDependencyUris } from '@dxos/echo/internal';
import { isProxy } from '@dxos/echo/internal';
import { assertArgument, invariant } from '@dxos/invariant';
import { EID, EntityId, type SpaceId, URI } from '@dxos/keys';
import { log } from '@dxos/log';
import { ComplexMap, defer, getDeep, setDeep, throwUnhandledError } from '@dxos/util';

import { type DocHandleProxy } from '../automerge';
import * as Doc from '../automerge/Doc';
import { docChangeSemaphore } from './doc-semaphore';
import { type DecodedAutomergePrimaryValue, type GetObjectCoreByIdOptions, TargetKey } from './types';

/**
 * Minimal interface that ObjectCore requires from the containing database.
 * Kept in this file (rather than types.ts) to avoid a circular import:
 * types.ts must not reference ObjectCore.
 * @internal
 */
export interface IDatabaseBinding {
  readonly spaceId: SpaceId;
  getObjectCoreById(id: string, opts?: GetObjectCoreByIdOptions): ObjectCore | undefined;
}

// Strings longer than this will have collaborative editing disabled for performance reasons.
// TODO(dmaretskyi): Remove in favour of explicitly specifying this in the API/Schema.
const STRING_CRDT_LIMIT = 300_000;

export const META_NAMESPACE = 'meta';
const SYSTEM_NAMESPACE = 'system';

export type ObjectCoreOptions = {
  type?: EncodedReference;
  meta?: EntityMeta;
  immutable?: boolean;
};

/**
 *
 */
// TODO(burdon): Comment.
export class ObjectCore {
  // TODO(dmaretskyi): Start making some of those fields private.
  // TODO(dmaretskyi): Create a discriminated union for the bound/not bound states.

  /**
   * Id of the ECHO object.
   */
  public id = EntityId.random();

  /**
   * Set when the object is bound to a database.
   */
  public entityManager?: IDatabaseBinding | undefined;

  /**
   * Set when the object is not bound to a database.
   */
  public doc?: AutomergeDoc<EntityStructure> | undefined;

  /**
   * Set when the object is bound to a database.
   */
  public docHandle?: DocHandleProxy<DatabaseDirectory> = undefined;

  /**
   * Key path at where we are mounted in the `doc` or `docHandle`.
   * The value at path must be of type `EntityStructure`.
   */
  public mountPath: Doc.KeyPath = [];

  /**
   * Handles link resolution as well as manual changes.
   */
  public readonly updates = new Event();

  // -------------------------------------------------------------------------
  // Fields merged from ObjectInternals (formerly echo-proxy-target.ts).
  // The EchoDatabase reference is typed `unknown` here to avoid a circular dep
  // between core-db ← proxy-db; echo-handler casts it at the usage sites.
  // -------------------------------------------------------------------------

  /**
   * EchoDatabase reference. Set by echo-handler on db.add(); typed narrowly
   * at usage sites in echo-handler to avoid a circular dep with proxy-db.
   */
  public database: unknown = undefined;

  /**
   * Caching proxy targets by key path (record | array subtargets).
   * Value typed as `object` to avoid importing ProxyTarget from echo-handler.
   */
  public targetsMap = new ComplexMap<TargetKey, object>(TargetKey.hash);

  /**
   * Until an object is persisted in the database, linked object references
   * are held in this cache. Cleared on db.add().
   */
  public linkCache: Map<string, Entity.Unknown> | undefined = new Map<string, Entity.Unknown>();

  /** Cleanup functions registered by the proxy layer. */
  public subscriptions: CleanupFn[] = [];

  /**
   * `Type.AnyEntity` of the root object. Populated when a Type entity is
   * available (e.g. created via `Obj.make(SomeType, ...)`); undefined for
   * objects created without a typed schema.
   */
  public rootSchema?: Type.AnyEntity = undefined;

  /**
   * Memoized rebuilt Effect Schema for persisted `Type.Type` entities.
   * Lazily populated; invalidated when the entity's `jsonSchema` changes.
   */
  public cachedStaticSlot?: Schema.Schema.AnyNoContext = undefined;

  /**
   * The single root proxy for this core. Replaces the `DatabaseImpl._rootProxies`
   * Map; set on first proxy construction and on db.add().
   */
  public rootProxy?: Entity.Unknown = undefined;

  toString(): string {
    return `ObjectCore { id: ${this.id} }`;
  }

  [inspectCustom](depth: number, options: InspectOptionsStylized, inspectFn: typeof inspect): string {
    return `ObjectCore ${inspectFn({ id: this.id }, options)}`;
  }

  /**
   * Create local doc with initial state from this object.
   */
  initNewObject(initialProps?: unknown, opts?: ObjectCoreOptions): void {
    invariant(!this.docHandle && !this.doc);

    initialProps ??= {};

    this.doc = A.from<EntityStructure>({
      data: this.encode(initialProps),
      meta: this.encode({
        ...opts?.meta,
        keys: opts?.meta?.keys ?? [],
        tags: opts?.meta?.tags ?? [],
        annotations: opts?.meta?.annotations ?? {},
      }),
      system: { createdAt: Date.now() },
    });
  }

  bind(options: BindOptions): void {
    // When loading existing documents, wait for the document to be ready.
    // When creating new documents (assignFromLocalState), the local doc is immediately usable.
    invariant(options.assignFromLocalState || options.docHandle.isReady());
    this.entityManager = options.db;
    this.docHandle = options.docHandle;
    this.mountPath = options.path;

    const doc = this.doc;
    this.doc = undefined;

    if (options.assignFromLocalState) {
      invariant(doc, 'assignFromLocalState');

      // Prevent recursive change calls.
      using _ = defer(docChangeSemaphore(this.docHandle ?? this));

      this.docHandle.change((newDoc: DatabaseDirectory) => {
        setDeep(newDoc, this.mountPath, doc);
      });
    }

    this.notifyUpdate();
  }

  getDoc(): AutomergeDoc<unknown> {
    if (this.doc) {
      return this.doc;
    }

    if (this.docHandle) {
      return this.docHandle.doc();
    }

    throw new Error('Invalid ObjectCore state');
  }

  getObjectStructure(): EntityStructure {
    return getDeep(this.getDoc(), this.mountPath) as EntityStructure;
  }

  /**
   * Do not take into account mountPath.
   */
  change(changeFn: ChangeFn<any>, options?: A.ChangeOptions<any>): void {
    // Prevent recursive change calls.
    using _ = defer(docChangeSemaphore(this.docHandle ?? this));

    if (this.doc) {
      if (options) {
        this.doc = A.change(this.doc!, options, changeFn);
      } else {
        this.doc = A.change(this.doc!, changeFn);
      }

      // No change event is emitted here since we are not using the doc handle. Notify listeners manually.
      this.notifyUpdate();
    } else {
      invariant(this.docHandle);
      this.docHandle.change(changeFn, options);
      // Note: We don't need to notify listeners here, since `change` event is already processed by DB.
    }
  }

  /**
   * Do not take into account mountPath.
   */
  changeAt(heads: Heads, callback: ChangeFn<any>, options?: ChangeOptions<any>): Heads | undefined {
    // Prevent recursive change calls.
    using _ = defer(docChangeSemaphore(this.docHandle ?? this));

    let result: Heads | undefined;
    if (this.doc) {
      if (options) {
        const { newDoc, newHeads } = A.changeAt(this.doc!, heads, options, callback);
        this.doc = newDoc;
        result = newHeads ?? undefined;
      } else {
        const { newDoc, newHeads } = A.changeAt(this.doc!, heads, callback);
        this.doc = newDoc;
        result = newHeads ?? undefined;
      }

      // No change event is emitted here since we are not using the doc handle. Notify listeners manually.
      this.notifyUpdate();
    } else {
      invariant(this.docHandle);
      result = this.docHandle.changeAt(heads, callback, options);
      // Note: We don't need to notify listeners here, since `change` event is already processed by DB.
    }

    return result;
  }

  getDocAccessor(path: Doc.KeyPath = []): Doc.Accessor {
    assertArgument(Doc.isKeyPath(path), 'path');
    const self = this;
    return {
      handle: {
        doc: () => this.getDoc(),
        change: (callback, options) => {
          this.change(callback, options);
        },
        changeAt: (heads, callback, options) => {
          return this.changeAt(heads, callback, options);
        },
        addListener: (event, listener) => {
          if (event === 'change') {
            // TODO(dmaretskyi): We probably don't need to subscribe to docHandle here separately.
            this.docHandle?.on('change', listener);
            this.updates.on(listener);
          }
        },
        removeListener: (event, listener) => {
          if (event === 'change') {
            // TODO(dmaretskyi): We probably don't need to subscribe to docHandle here separately.
            this.docHandle?.off('change', listener);
            this.updates.off(listener);
          }
        },
      },
      get path() {
        return [...self.mountPath, 'data', ...path];
      },
    };
  }

  /**
   * Fire a synchronous update notification via signal and event subscriptions.
   * Called after local changes and link resolution.
   * This function can be used unbound.
   */
  public readonly notifyUpdate = () => {
    try {
      this.updates.emit();
    } catch (err: any) {
      // Print the error message synchronously for easier debugging.
      // The stack trace and details will be printed asynchronously.
      log.catch(err);

      // Reports all errors that happen during even propagation as unhandled.
      // This is important since we don't want to silently swallow errors.
      // Unfortunately, this will only report errors in the next microtask after the current stack has already unwound.
      // TODO(dmaretskyi): Take some inspiration from facebook/react/packages/shared/invokeGuardedCallbackImpl.js
      throwUnhandledError(err);
    }
  };

  /**
   * Encode a value to be stored in the Automerge document.
   * Accepts arbitrary decoded input: in addition to {@link DecodedAutomergePrimaryValue}, this recursively
   * serializes structured values such as entity meta, whose annotation dictionary holds opaque
   * (schema-encoded) payloads that are not statically typed.
   */
  encode(value: unknown) {
    if (isProxy(value) as boolean) {
      throw new TypeError('Linking is not allowed');
    }

    if (value instanceof A.RawString) {
      return value;
    }
    if (value === undefined) {
      return null;
    }

    // EncodedReference values are already in the correct format for storage.
    if (isEncodedReference(value)) {
      return value;
    }
    if (value instanceof Uint8Array) {
      // Automerge stores Uint8Array natively; do not recurse into its byte indices.
      return value;
    }
    if (Array.isArray(value)) {
      const values: any = value.map((val) => this.encode(val));
      return values;
    }
    if (typeof value === 'object' && value !== null) {
      const entries = Object.entries(value).filter(([_, value]) => value !== undefined);
      return Object.fromEntries(entries.map(([key, value]): [string, any] => [key, this.encode(value)]));
    }

    if (typeof value === 'string' && value.length > STRING_CRDT_LIMIT) {
      return new A.RawString(value);
    }

    return value;
  }

  /**
   * Decode a value from the Automerge document.
   */
  decode(value: any): DecodedAutomergePrimaryValue {
    if (value === null) {
      return value;
    }
    if (Array.isArray(value)) {
      return value.map((val) => this.decode(val));
    }
    if (value instanceof A.RawString) {
      return value.toString();
    }
    if (value instanceof Uint8Array) {
      return value;
    }
    // EncodedReference values are already in the correct format.
    if (isEncodedReference(value)) {
      return value;
    }
    if (typeof value === 'object') {
      return Object.fromEntries(Object.entries(value).map(([key, value]): [string, any] => [key, this.decode(value)]));
    }

    return value;
  }

  arrayPush(path: Doc.KeyPath, items: DecodedAutomergePrimaryValue[]): number {
    const itemsEncoded = items.map((item) => this.encode(item));

    let newLength: number = -1;
    this.change((doc) => {
      const fullPath = [...this.mountPath, ...path];
      const array = getDeep(doc, fullPath);
      invariant(Array.isArray(array));
      newLength = array.push(...itemsEncoded);
    });
    invariant(newLength !== -1);
    return newLength;
  }

  private _getRaw(path: Doc.KeyPath): AutomergeDoc<EntityStructure> | AutomergeDoc<DatabaseDirectory> {
    const fullPath = [...this.mountPath, ...path];

    let value = this.getDoc();
    for (const key of fullPath) {
      value = (value as any)?.[key];
    }

    return value;
  }

  private _setRaw(path: Doc.KeyPath, value: any): void {
    const fullPath = [...this.mountPath, ...path];

    this.change((doc) => {
      setDeep(doc, fullPath, value);
    });
  }

  // TODO(dmaretskyi): Rename to `get`.
  getDecoded(path: Doc.KeyPath): DecodedAutomergePrimaryValue {
    const decoded = this.decode(this._getRaw(path));
    return upgradeMeta(path, decoded) as DecodedAutomergePrimaryValue;
  }

  // TODO(dmaretskyi): Rename to `set`.
  setDecoded(path: Doc.KeyPath, value: DecodedAutomergePrimaryValue): void {
    this._setRaw(path, this.encode(value));
  }

  /**
   * Deletes key at path.
   */
  delete(path: Doc.KeyPath): void {
    const fullPath = [...this.mountPath, ...path];

    this.change((doc) => {
      const value: any = getDeep(doc, fullPath.slice(0, fullPath.length - 1));
      delete value[fullPath[fullPath.length - 1]];
    });
  }

  getKind(): EntityKind {
    return (this._getRaw([SYSTEM_NAMESPACE, 'kind']) as any) ?? EntityKind.Object;
  }

  // TODO(dmaretskyi): Just set statically during construction.
  setKind(kind: EntityKind): void {
    this._setRaw([SYSTEM_NAMESPACE, 'kind'], kind);
  }

  getSource(): EncodedReference | undefined {
    const res = this._getRaw([SYSTEM_NAMESPACE, 'source']);
    if (!res || !EncodedReference.isEncodedReference(res)) {
      return undefined;
    }
    return res;
  }

  // TODO(dmaretskyi): Just set statically during construction.
  setSource(ref: EncodedReference): void {
    this._setRaw([SYSTEM_NAMESPACE, 'source'], ref);
  }

  getTarget(): EncodedReference | undefined {
    const res = this._getRaw([SYSTEM_NAMESPACE, 'target']);
    if (!res || !EncodedReference.isEncodedReference(res)) {
      return undefined;
    }
    return res;
  }

  // TODO(dmaretskyi): Just set statically during construction.
  setTarget(ref: EncodedReference): void {
    this._setRaw([SYSTEM_NAMESPACE, 'target'], ref);
  }

  getParent(): EncodedReference | undefined {
    const res = this._getRaw([SYSTEM_NAMESPACE, 'parent']);
    if (!res || !EncodedReference.isEncodedReference(res)) {
      return undefined;
    }
    return res;
  }

  setParent(ref: EncodedReference | undefined): void {
    if (ref === undefined) {
      this.delete([SYSTEM_NAMESPACE, 'parent']);
    } else {
      this._setRaw([SYSTEM_NAMESPACE, 'parent'], ref);
    }
  }

  getType(): EncodedReference | undefined {
    const res = this._getRaw([SYSTEM_NAMESPACE, 'type']);
    if (!res || !EncodedReference.isEncodedReference(res)) {
      return undefined;
    }
    return res;
  }

  setType(ref: EncodedReference): void {
    this._setRaw([SYSTEM_NAMESPACE, 'type'], ref);
  }

  /**
   * Returns the Unix ms timestamp stored in system.createdAt, or undefined for objects
   * created before this field was introduced.
   */
  getCreatedAt(): number | undefined {
    const value = this._getRaw([SYSTEM_NAMESPACE, 'createdAt']);
    return typeof value === 'number' ? value : undefined;
  }

  /**
   * Returns the Unix ms timestamp of the last automerge change on this document,
   * or undefined when no change history is available.
   * Note: second-level precision (automerge change timestamps are Unix seconds).
   * Only inspects the current head changes (O(heads)), not all history.
   */
  getUpdatedAt(): number | undefined {
    const doc = this.doc ?? this.docHandle?.doc();
    if (!doc) {
      return undefined;
    }
    let maxTime = 0;
    // Inspect only the current frontier (heads) — O(number of heads) ≈ O(1).
    // `doc` union type doesn't affect getHeads/inspectChange; cast at the boundary.
    for (const hash of A.getHeads(doc as any)) {
      const decoded = A.inspectChange(doc as any, hash);
      if (decoded && decoded.time > maxTime) {
        maxTime = decoded.time;
      }
    }
    return maxTime > 0 ? maxTime * 1000 : undefined;
  }

  getMeta(): EntityMeta {
    // Codec boundary: raw decoded automerge data is returned typed as the logical `EntityMeta`
    // (tags are encoded references at rest; the handler materializes them into live refs on access).
    return this.getDecoded([META_NAMESPACE]) as unknown as EntityMeta;
  }

  setMeta(meta: EntityMeta): void {
    this._setRaw([META_NAMESPACE], this.encode(meta));
  }

  isDeleted(remainingDepth: number = 10): boolean {
    const value = this._getRaw([SYSTEM_NAMESPACE, 'deleted']);
    const ownDeleted = typeof value === 'boolean' ? value : false;
    if (ownDeleted) {
      return true;
    }

    if (this.entityManager && remainingDepth > 0) {
      // An entity is transitively deleted when one of its strong dependencies is deleted: a child
      // when its parent is removed, or a relation when either endpoint is removed — a dangling
      // relation has no valid graph edge, so it is treated as deleted and excluded from queries.
      if (this._isReferencedCoreDeleted(this.getParent(), remainingDepth)) {
        return true;
      }
      if (this.getKind() === EntityKind.Relation) {
        if (
          this._isReferencedCoreDeleted(this.getSource(), remainingDepth) ||
          this._isReferencedCoreDeleted(this.getTarget(), remainingDepth)
        ) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Whether the same-space entity referenced by `ref` is (transitively) deleted. Cross-space and
   * unresolved references are treated as not-deleted. Strong dependencies guarantee parent/relation
   * endpoints load alongside the dependent entity, so this stays a synchronous core lookup —
   * `loadObjectCoreById` is avoided because it may be async.
   */
  private _isReferencedCoreDeleted(ref: EncodedReference | undefined, remainingDepth: number): boolean {
    if (!ref || !this.entityManager) {
      return false;
    }
    const echoUri = EID.tryParse(EncodedReference.toURI(ref));
    const spaceId = echoUri ? EID.getSpaceId(echoUri) : undefined;
    const entityId = echoUri ? EID.getEntityId(echoUri) : undefined;
    if (!entityId || (spaceId !== undefined && spaceId !== this.entityManager.spaceId)) {
      return false;
    }
    const core = this.entityManager.getObjectCoreById(entityId);
    return core != null && core.isDeleted(remainingDepth - 1);
  }

  setDeleted(value: boolean): void {
    this._setRaw([SYSTEM_NAMESPACE, 'deleted'], value);
  }

  /**
   * URIs of the entities that this entity strongly depends on: the schema reference (when stored as
   * an object), source/target for relations, and the parent ref. Strong dependencies are loaded
   * together with the depending entity before it is surfaced. URIs may be cross-space `echo:` EIDs
   * or queue-item EIDs; the resolver routes each to the appropriate backend.
   */
  getStrongDependencies(): URI.URI[] {
    const typeRef = this.getType();
    const sourceRef = this.getSource();
    const targetRef = this.getTarget();
    const parentRef = this.getParent();
    return getStrongDependencyUris(
      {
        kind: this.getKind(),
        type: typeRef ? EncodedReference.toURI(typeRef) : undefined,
        source: sourceRef ? EncodedReference.toURI(sourceRef) : undefined,
        target: targetRef ? EncodedReference.toURI(targetRef) : undefined,
        parent: parentRef ? EncodedReference.toURI(parentRef) : undefined,
      },
      this.entityManager?.spaceId,
    );
  }
}

export type BindOptions = {
  db: IDatabaseBinding;
  docHandle: DocHandleProxy<DatabaseDirectory>;
  path: Doc.KeyPath;
  /** Assign the state from the local doc into the shared structure for the database. */
  assignFromLocalState?: boolean;
};

export const objectIsUpdated = (objId: string, event: DocHandleChangePayload<DatabaseDirectory>) => {
  if (event.patches.some((patch) => patch.path[0] === 'objects' && patch.path[1] === objId)) {
    return true;
  }
  return false;
};

/**
 * Lazily normalizes `meta` on read so the now-required `tags`/`annotations` fields are always present,
 * and upgrades bare string entries in `meta.tags` to {@link EncodedReference}s so they materialize as
 * `Ref<Tag>` like any other reference. The transform happens on read and persists physically only on the
 * next write. This keeps data written before these fields existed (or before tags became refs) readable
 * without an eager migration. Scoped strictly to the `meta` namespace so unrelated values in `data` are
 * untouched.
 */
const upgradeMeta = (path: Doc.KeyPath, value: unknown): unknown => {
  if (path[0] !== META_NAMESPACE) {
    return value;
  }
  // Whole `meta` object: backfill required fields and upgrade tag ids.
  if (path.length === 1 && value != null && typeof value === 'object') {
    const meta = value as Record<string, unknown>;
    return {
      ...meta,
      tags: Array.isArray(meta.tags) ? meta.tags.map(upgradeTagRef) : [],
      annotations: meta.annotations ?? {},
    };
  }
  // `meta.tags`: default to an empty array when absent; upgrade string entries.
  if (path.length === 2 && path[1] === 'tags') {
    return Array.isArray(value) ? value.map(upgradeTagRef) : [];
  }
  // `meta.annotations`: default to an empty dictionary when absent.
  if (path.length === 2 && path[1] === 'annotations') {
    return value ?? {};
  }
  // A single `meta.tags[i]` element.
  if (path.length === 3 && path[1] === 'tags') {
    return upgradeTagRef(value);
  }
  return value;
};

const upgradeTagRef = (value: unknown): unknown => {
  if (typeof value !== 'string') {
    return value;
  }
  // A bare tag id string materializes as a `Ref<Tag>` like any other reference.
  const uri = EID.tryParse(value) ?? value;
  return EncodedReference.fromURI(URI.make(uri));
};
