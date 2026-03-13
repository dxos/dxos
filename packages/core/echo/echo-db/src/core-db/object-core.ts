//
// Copyright 2024 DXOS.org
//

import type { InspectOptionsStylized, inspect } from 'util';

import { next as A, type ChangeFn, type ChangeOptions, type Doc, type Heads } from '@automerge/automerge';
import { type DocHandleChangePayload } from '@automerge/automerge-repo';

import { Event } from '@dxos/async';
import { type Context } from '@dxos/context';
import { inspectCustom } from '@dxos/debug';
import { EntityKind, type ObjectMeta } from '@dxos/echo/internal';
import { isProxy } from '@dxos/echo/internal';
import {
  type DatabaseDirectory,
  EncodedReference,
  type ObjectStructure,
  isEncodedReference,
} from '@dxos/echo-protocol';
import { invariant } from '@dxos/invariant';
import { DXN, ObjectId } from '@dxos/keys';
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
  meta?: ObjectMeta;
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
  public id = ObjectId.random();

  /**
   * Set if when the object is bound to a database.
   */
  public database?: CoreDatabase | undefined;

  /**
   * Set if when the object is not bound to a database.
   */
  public doc?: Doc<ObjectStructure> | undefined;

  /**
   * Set if when the object is bound to a database.
   */
  public docHandle?: DocHandleProxy<DatabaseDirectory> = undefined;

  /**
   * Key path at where we are mounted in the `doc` or `docHandle`.
   * The value at path must be of type `ObjectStructure`.
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
  initNewObject(ctx: Context, initialProps?: unknown, opts?: ObjectCoreOptions): void {
    invariant(!this.docHandle && !this.doc);

    initialProps ??= {};

    this.doc = A.from<ObjectStructure>({
      data: this.encode(ctx, initialProps as any),
      meta: this.encode(ctx, {
        keys: [],
        ...opts?.meta,
      }),
      system: {},
    });
  }

  bind(ctx: Context, options: BindOptions): void {
    // When loading existing documents, wait for the document to be ready.
    // When creating new documents (assignFromLocalState), the local doc is immediately usable.
    invariant(options.assignFromLocalState || options.docHandle.isReady(ctx));
    this.database = options.db;
    this.docHandle = options.docHandle;
    this.mountPath = options.path;

    const doc = this.doc;
    this.doc = undefined;

    if (options.assignFromLocalState) {
      invariant(doc, 'assignFromLocalState');

      // Prevent recursive change calls.
      using _ = defer(docChangeSemaphore(this.docHandle ?? this));

      this.docHandle.change(ctx, (newDoc: DatabaseDirectory) => {
        setDeep(newDoc, this.mountPath, doc);
      });
    }

    this.notifyUpdate();
  }

  getDoc(ctx: Context): Doc<unknown> {
    if (this.doc) {
      return this.doc;
    }

    if (this.docHandle) {
      return this.docHandle.doc(ctx);
    }

    throw new Error('Invalid ObjectCore state');
  }

  getObjectStructure(ctx: Context): ObjectStructure {
    return getDeep(this.getDoc(ctx), this.mountPath) as ObjectStructure;
  }

  /**
   * Do not take into account mountPath.
   */
  change(ctx: Context, changeFn: ChangeFn<any>, options?: A.ChangeOptions<any>): void {
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
      this.docHandle.change(ctx, changeFn, options);
      // Note: We don't need to notify listeners here, since `change` event is already processed by DB.
    }
  }

  /**
   * Do not take into account mountPath.
   */
  changeAt(ctx: Context, heads: Heads, callback: ChangeFn<any>, options?: ChangeOptions<any>): Heads | undefined {
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
      result = this.docHandle.changeAt(ctx, heads, callback, options);
      // Note: We don't need to notify listeners here, since `change` event is already processed by DB.
    }

    return result;
  }

  getDocAccessor(ctx: Context, path: KeyPath = []): DocAccessor {
    invariant(isValidKeyPath(path));
    const self = this;
    return {
      handle: {
        doc: () => this.getDoc(ctx),
        change: (callback, options) => {
          this.change(ctx, callback, options);
        },
        changeAt: (heads, callback, options) => {
          return this.changeAt(ctx, heads, callback, options);
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
   */
  encode(ctx: Context, value: DecodedAutomergePrimaryValue) {
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
    if (Array.isArray(value)) {
      const values: any = value.map((val) => this.encode(ctx, val));
      return values;
    }
    if (typeof value === 'object' && value !== null) {
      const entries = Object.entries(value).filter(([_, value]) => value !== undefined);
      return Object.fromEntries(entries.map(([key, value]): [string, any] => [key, this.encode(ctx, value)]));
    }

    if (typeof value === 'string' && value.length > STRING_CRDT_LIMIT) {
      return new A.RawString(value);
    }

    return value;
  }

  /**
   * Decode a value from the Automerge document.
   */
  decode(ctx: Context, value: any): DecodedAutomergePrimaryValue {
    if (value === null) {
      return value;
    }
    if (Array.isArray(value)) {
      return value.map((val) => this.decode(ctx, val));
    }
    if (value instanceof A.RawString) {
      return value.toString();
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
      return Object.fromEntries(
        Object.entries(value).map(([key, value]): [string, any] => [key, this.decode(ctx, value)]),
      );
    }

    return value;
  }

  arrayPush(ctx: Context, path: KeyPath, items: DecodedAutomergePrimaryValue[]): number {
    const itemsEncoded = items.map((item) => this.encode(ctx, item));

    let newLength: number = -1;
    this.change(ctx, (doc) => {
      const fullPath = [...this.mountPath, ...path];
      const array = getDeep(doc, fullPath);
      invariant(Array.isArray(array));
      newLength = array.push(...itemsEncoded);
    });
    invariant(newLength !== -1);
    return newLength;
  }

  private _getRaw(ctx: Context, path: KeyPath): Doc<ObjectStructure> | Doc<DatabaseDirectory> {
    const fullPath = [...this.mountPath, ...path];

    let value = this.getDoc(ctx);
    for (const key of fullPath) {
      value = (value as any)?.[key];
    }

    return value;
  }

  private _setRaw(ctx: Context, path: KeyPath, value: any): void {
    const fullPath = [...this.mountPath, ...path];

    this.change(ctx, (doc) => {
      setDeep(doc, fullPath, value);
    });
  }

  // TODO(dmaretskyi): Rename to `get`.
  getDecoded(ctx: Context, path: KeyPath): DecodedAutomergePrimaryValue {
    return this.decode(ctx, this._getRaw(ctx, path)) as DecodedAutomergePrimaryValue;
  }

  // TODO(dmaretskyi): Rename to `set`.
  setDecoded(ctx: Context, path: KeyPath, value: DecodedAutomergePrimaryValue): void {
    this._setRaw(ctx, path, this.encode(ctx, value));
  }

  /**
   * Deletes key at path.
   */
  delete(ctx: Context, path: KeyPath): void {
    const fullPath = [...this.mountPath, ...path];

    this.change(ctx, (doc) => {
      const value: any = getDeep(doc, fullPath.slice(0, fullPath.length - 1));
      delete value[fullPath[fullPath.length - 1]];
    });
  }

  getKind(ctx: Context): EntityKind {
    return (this._getRaw(ctx, [SYSTEM_NAMESPACE, 'kind']) as any) ?? EntityKind.Object;
  }

  // TODO(dmaretskyi): Just set statically during construction.
  setKind(ctx: Context, kind: EntityKind): void {
    this._setRaw(ctx, [SYSTEM_NAMESPACE, 'kind'], kind);
  }

  getSource(ctx: Context): EncodedReference | undefined {
    const res = this._getRaw(ctx, [SYSTEM_NAMESPACE, 'source']);
    if (!res || !EncodedReference.isEncodedReference(res)) {
      return undefined;
    }
    return res;
  }

  // TODO(dmaretskyi): Just set statically during construction.
  setSource(ctx: Context, ref: EncodedReference): void {
    this._setRaw(ctx, [SYSTEM_NAMESPACE, 'source'], ref);
  }

  getTarget(ctx: Context): EncodedReference | undefined {
    const res = this._getRaw(ctx, [SYSTEM_NAMESPACE, 'target']);
    if (!res || !EncodedReference.isEncodedReference(res)) {
      return undefined;
    }
    return res;
  }

  // TODO(dmaretskyi): Just set statically during construction.
  setTarget(ctx: Context, ref: EncodedReference): void {
    this._setRaw(ctx, [SYSTEM_NAMESPACE, 'target'], ref);
  }

  getParent(ctx: Context): EncodedReference | undefined {
    const res = this._getRaw(ctx, [SYSTEM_NAMESPACE, 'parent']);
    if (!res || !EncodedReference.isEncodedReference(res)) {
      return undefined;
    }
    return res;
  }

  setParent(ctx: Context, ref: EncodedReference | undefined): void {
    if (ref === undefined) {
      this.delete(ctx, [SYSTEM_NAMESPACE, 'parent']);
    } else {
      this._setRaw(ctx, [SYSTEM_NAMESPACE, 'parent'], ref);
    }
  }

  getType(ctx: Context): EncodedReference | undefined {
    const res = this._getRaw(ctx, [SYSTEM_NAMESPACE, 'type']);
    if (!res || !EncodedReference.isEncodedReference(res)) {
      return undefined;
    }
    return res;
  }

  setType(ctx: Context, ref: EncodedReference): void {
    this._setRaw(ctx, [SYSTEM_NAMESPACE, 'type'], ref);
  }

  getMeta(ctx: Context): ObjectMeta {
    return this.getDecoded(ctx, [META_NAMESPACE]) as ObjectMeta;
  }

  setMeta(ctx: Context, meta: ObjectMeta): void {
    this._setRaw(ctx, [META_NAMESPACE], this.encode(ctx, meta));
  }

  isDeleted(ctx: Context, remainingDepth: number = 10): boolean {
    const value = this._getRaw(ctx, [SYSTEM_NAMESPACE, 'deleted']);
    const ownDeleted = typeof value === 'boolean' ? value : false;
    if (ownDeleted) {
      return true;
    }

    if (this.database && remainingDepth > 0) {
      const parentRef = this.getParent(ctx);
      if (parentRef) {
        // Checks if the reference is pointing to an object in the same space.
        const parentDXN = EncodedReference.toDXN(parentRef);
        const echoDXN = parentDXN.asEchoDXN();
        if (echoDXN && (echoDXN.spaceId === undefined || echoDXN.spaceId === this.database.spaceId)) {
          const parentId = echoDXN.echoId;
          // NOTE: We can't use `loadObjectCoreById` here because it might be async and we need a sync check.
          // If the parent is not loaded, we assume it's not deleted for now, or should we assume deleted?
          // Given strong dependencies, the parent SHOULD be loaded if the child is loaded.
          const parent = this.database.getObjectCoreById(ctx, parentId);
          if (parent && parent.isDeleted(ctx, remainingDepth - 1)) {
            return true;
          }
        }
      }
    }
    return false;
  }

  setDeleted(ctx: Context, value: boolean): void {
    this._setRaw(ctx, [SYSTEM_NAMESPACE, 'deleted'], value);
  }

  /**
   * DXNs of objects that this object strongly depends on.
   * Strong references are loaded together with the source object.
   * Currently this is the schema reference and the source and target for relations.
   */
  getStrongDependencies(ctx: Context): DXN[] {
    const res: DXN[] = [];

    const typeRef = this.getType(ctx);
    if (typeRef) {
      const typeDXN = EncodedReference.toDXN(typeRef);
      if (typeDXN.kind === DXN.kind.ECHO) {
        res.push(typeDXN);
      }
    }

    if (this.getKind(ctx) === EntityKind.Relation) {
      const sourceRef = this.getSource(ctx);
      if (sourceRef) {
        res.push(EncodedReference.toDXN(sourceRef));
      }
      const targetRef = this.getTarget(ctx);
      if (targetRef) {
        res.push(EncodedReference.toDXN(targetRef));
      }
    }

    const parentRef = this.getParent(ctx);
    if (parentRef) {
      res.push(EncodedReference.toDXN(parentRef));
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
  let dxn: DXN;
  if (value.protocol === TYPE_PROTOCOL) {
    dxn = new DXN(DXN.kind.TYPE, [value.objectId]);
  } else if (value.host) {
    dxn = new DXN(DXN.kind.ECHO, [value.host, value.objectId]);
  } else {
    dxn = DXN.fromLocalObjectId(value.objectId);
  }
  return EncodedReference.fromDXN(dxn);
};
