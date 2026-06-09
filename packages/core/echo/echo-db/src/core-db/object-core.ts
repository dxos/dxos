//
// Copyright 2024 DXOS.org
//

import { next as A, type ChangeFn, type ChangeOptions, type Doc, type Heads } from '@automerge/automerge';
import { type DocHandleChangePayload } from '@automerge/automerge-repo';
import type { InspectOptionsStylized, inspect } from 'util';

import { Event } from '@dxos/async';
import { inspectCustom } from '@dxos/debug';
import {
  type DatabaseDirectory,
  EncodedReference,
  type EntityStructure,
  isEncodedReference,
} from '@dxos/echo-protocol';
import { EntityKind, type EntityMeta } from '@dxos/echo/internal';
import { isProxy } from '@dxos/echo/internal';
import { assertArgument, invariant } from '@dxos/invariant';
import { DXN, EID, EntityId, SpaceId, URI } from '@dxos/keys';
import { log } from '@dxos/log';
import { defer, getDeep, setDeep, throwUnhandledError } from '@dxos/util';

import { type DocHandleProxy } from '../automerge';
import { type CoreDatabase } from './core-database';
import { docChangeSemaphore } from './doc-semaphore';
import { type DecodedAutomergePrimaryValue, type DocAccessor, type KeyPath, isValidKeyPath } from './types';

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
   * Set if when the object is bound to a database.
   */
  public database?: CoreDatabase | undefined;

  /**
   * Set if when the object is not bound to a database.
   */
  public doc?: Doc<EntityStructure> | undefined;

  /**
   * Set if when the object is bound to a database.
   */
  public docHandle?: DocHandleProxy<DatabaseDirectory> = undefined;

  /**
   * Key path at where we are mounted in the `doc` or `docHandle`.
   * The value at path must be of type `EntityStructure`.
   */
  public mountPath: KeyPath = [];

  /**
   * Handles link resolution as well as manual changes.
   */
  public readonly updates = new Event();

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
    this.database = options.db;
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

  getDoc(): Doc<unknown> {
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

  getDocAccessor(path: KeyPath = []): DocAccessor {
    assertArgument(isValidKeyPath(path), 'path');
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
    // For some reason references without `@type` are being stored in the document.
    // Convert legacy proto-format references to EncodedReference.
    if (maybeReference(value)) {
      return convertLegacyProtoReference(value);
    }
    if (typeof value === 'object') {
      return Object.fromEntries(Object.entries(value).map(([key, value]): [string, any] => [key, this.decode(value)]));
    }

    return value;
  }

  arrayPush(path: KeyPath, items: DecodedAutomergePrimaryValue[]): number {
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

  private _getRaw(path: KeyPath): Doc<EntityStructure> | Doc<DatabaseDirectory> {
    const fullPath = [...this.mountPath, ...path];

    let value = this.getDoc();
    for (const key of fullPath) {
      value = (value as any)?.[key];
    }

    return value;
  }

  private _setRaw(path: KeyPath, value: any): void {
    const fullPath = [...this.mountPath, ...path];

    this.change((doc) => {
      setDeep(doc, fullPath, value);
    });
  }

  // TODO(dmaretskyi): Rename to `get`.
  getDecoded(path: KeyPath): DecodedAutomergePrimaryValue {
    const decoded = this.decode(this._getRaw(path));
    return upgradeMeta(path, decoded) as DecodedAutomergePrimaryValue;
  }

  // TODO(dmaretskyi): Rename to `set`.
  setDecoded(path: KeyPath, value: DecodedAutomergePrimaryValue): void {
    this._setRaw(path, this.encode(value));
  }

  /**
   * Deletes key at path.
   */
  delete(path: KeyPath): void {
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
   */
  getUpdatedAt(): number | undefined {
    const doc = this.doc ?? this.docHandle?.doc();
    if (!doc) {
      return undefined;
    }
    // `doc` is Doc<EntityStructure>|Doc<DatabaseDirectory>; getChangesMetaSince operates on
    // the underlying automerge state irrespective of the data type — no typed alternative.
    const changes = A.getChangesMetaSince(doc as any, []);
    let maxTime = 0;
    for (const change of changes) {
      if (change.time > maxTime) {
        maxTime = change.time;
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

    if (this.database && remainingDepth > 0) {
      const parentRef = this.getParent();
      if (parentRef) {
        // Checks if the reference is pointing to an object in the same space.
        const parentDXN = EncodedReference.toURI(parentRef);
        const parentEchoUri = EID.tryParse(parentDXN);
        const spaceId = parentEchoUri ? EID.getSpaceId(parentEchoUri) : undefined;
        const parentId = parentEchoUri ? EID.getEntityId(parentEchoUri) : undefined;
        if (parentId && (spaceId === undefined || spaceId === this.database.spaceId)) {
          // NOTE: We can't use `loadObjectCoreById` here because it might be async and we need a sync check.
          // If the parent is not loaded, we assume it's not deleted for now, or should we assume deleted?
          // Given strong dependencies, the parent SHOULD be loaded if the child is loaded.
          const parent = this.database.getObjectCoreById(parentId);
          if (parent && parent.isDeleted(remainingDepth - 1)) {
            return true;
          }
        }
      }
    }
    return false;
  }

  setDeleted(value: boolean): void {
    this._setRaw([SYSTEM_NAMESPACE, 'deleted'], value);
  }

  /**
   * EIDs of objects that this object strongly depends on.
   * Strong references are loaded together with the source object — only ECHO-scheme refs
   * (object refs) qualify; type DXNs are resolved separately via the schema registry.
   * Currently this is the schema reference (when stored as an object), source/target for
   * relations, and the parent ref.
   */
  getStrongDependencies(): EID.EID[] {
    const res: EID.EID[] = [];

    const typeRef = this.getType();
    if (typeRef) {
      const typeEchoUri = EID.tryParse(EncodedReference.toURI(typeRef));
      if (typeEchoUri) {
        res.push(typeEchoUri);
      }
    }

    if (this.getKind() === EntityKind.Relation) {
      const sourceRef = this.getSource();
      if (sourceRef) {
        const id = EID.tryParse(EncodedReference.toURI(sourceRef));
        if (id) {
          res.push(id);
        }
      }
      const targetRef = this.getTarget();
      if (targetRef) {
        const id = EID.tryParse(EncodedReference.toURI(targetRef));
        if (id) {
          res.push(id);
        }
      }
    }

    const parentRef = this.getParent();
    if (parentRef) {
      const id = EID.tryParse(EncodedReference.toURI(parentRef));
      if (id) {
        res.push(id);
      }
    }

    return res;
  }
}

export type BindOptions = {
  db: CoreDatabase;
  docHandle: DocHandleProxy<DatabaseDirectory>;
  path: KeyPath;

  /**
   * Assign the state from the local doc into the shared structure for the database.
   */
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
 * and upgrades legacy string entries in `meta.tags` (bare DXN/EID URIs) to {@link EncodedReference}s so
 * they materialize as `Ref<Tag>` like any other reference. Mirrors {@link convertLegacyProtoReference}:
 * the transform happens on read and persists physically only on the next write. This keeps data written
 * before these fields existed (or before tags became refs) readable without an eager migration.
 * Scoped strictly to the `meta` namespace so unrelated values in `data` are untouched.
 */
const upgradeMeta = (path: KeyPath, value: unknown): unknown => {
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
  // Normalize legacy DXN object references (e.g. `dxn:echo:@:<id>`) to the canonical `echo:` EID;
  // leave non-EID ids (e.g. `dxn:type:…`) untouched.
  const uri = EID.tryParse(value) ?? value;
  return EncodedReference.fromURI(URI.make(uri));
};

// TODO(burdon): Move to echo-protocol.
const maybeReference = (value: unknown): value is { objectId: string; protocol?: string; host?: string } =>
  typeof value === 'object' &&
  value !== null &&
  Object.keys(value).length === 3 &&
  'objectId' in value && // TODO(burdon): 'objectId'
  'protocol' in value &&
  'host' in value;

/**
 * Convert legacy proto-format reference `{ objectId, protocol, host }` to EncodedReference.
 */
const convertLegacyProtoReference = (value: {
  objectId: string;
  protocol?: string;
  host?: string;
}): EncodedReference => {
  const TYPE_PROTOCOL = 'protobuf';
  let uri: URI.URI;
  if (value.protocol === TYPE_PROTOCOL) {
    uri = DXN.make(value.objectId);
  } else if (value.host) {
    invariant(SpaceId.isValid(value.host), 'Invalid space id');
    invariant(EntityId.isValid(value.objectId), 'Invalid object id');
    uri = EID.make({ spaceId: value.host, entityId: value.objectId });
  } else {
    invariant(EntityId.isValid(value.objectId), 'Invalid object id');
    uri = EID.make({ entityId: value.objectId });
  }
  return EncodedReference.fromURI(uri);
};
