//
// Copyright 2024 DXOS.org
//

import type { InspectOptionsStylized, inspect } from 'util';

import { next as A, type ChangeFn, type ChangeOptions, type Doc, type Heads } from '@automerge/automerge';
import { type DocHandleChangePayload } from '@automerge/automerge-repo';

import { Event } from '@dxos/async';
import { inspectCustom } from '@dxos/debug';
import { EntityKind, type ObjectMeta } from '@dxos/echo/internal';
import {
  type DatabaseDirectory,
  EncodedReference,
  type ObjectStructure,
  isEncodedReference,
} from '@dxos/echo-protocol';
import { invariant } from '@dxos/invariant';
import { DXN, ObjectId } from '@dxos/keys';
import { isLiveObject } from '@dxos/live-object';
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
  type?: DXN;
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
  initNewObject(initialProps?: unknown, opts?: ObjectCoreOptions): void {
    invariant(!this.docHandle && !this.doc);

    initialProps ??= {};

    this.doc = A.from<ObjectStructure>({
      data: this.encode(initialProps as any),
      meta: this.encode({
        keys: [],
        ...opts?.meta,
      }),
      system: {},
    });
  }

  bind(options: BindOptions): void {
    invariant(options.docHandle.isReady());
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

  getObjectStructure(): ObjectStructure {
    return getDeep(this.getDoc(), this.mountPath) as ObjectStructure;
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
    invariant(isValidKeyPath(path));
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
   */
  encode(value: DecodedAutomergePrimaryValue) {
    if (isLiveObject(value) as boolean) {
      throw new TypeError('Linking is not allowed');
    }

    if (value instanceof A.RawString) {
      return value;
    }
    if (value === undefined) {
      return null;
    }

    if (value instanceof DXN) {
      return EncodedReference.fromDXN(value);
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
    // For some reason references without `@type` are being stored in the document.
    if (isEncodedReference(value) || maybeReference(value)) {
      return EncodedReference.toDXN(value);
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

  private _getRaw(path: KeyPath): Doc<ObjectStructure> | Doc<DatabaseDirectory> {
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
    return this.decode(this._getRaw(path)) as DecodedAutomergePrimaryValue;
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

  getSource(): DXN | undefined {
    const res = this.getDecoded([SYSTEM_NAMESPACE, 'source']);
    invariant(res === undefined || res instanceof DXN);
    return res;
  }

  // TODO(dmaretskyi): Just set statically during construction.
  setSource(dxn: DXN): void {
    this.setDecoded([SYSTEM_NAMESPACE, 'source'], dxn);
  }

  getTarget(): DXN | undefined {
    const res = this.getDecoded([SYSTEM_NAMESPACE, 'target']);
    invariant(res === undefined || res instanceof DXN);
    return res;
  }

  // TODO(dmaretskyi): Just set statically during construction.
  setTarget(dxn: DXN): void {
    this.setDecoded([SYSTEM_NAMESPACE, 'target'], dxn);
  }

  getType(): DXN | undefined {
    const value = this.decode(this._getRaw([SYSTEM_NAMESPACE, 'type']));
    if (!value) {
      return undefined;
    }

    invariant(value instanceof DXN);
    return value;
  }

  setType(dxn: DXN): void {
    this._setRaw([SYSTEM_NAMESPACE, 'type'], this.encode(dxn));
  }

  getMeta(): ObjectMeta {
    return this.getDecoded([META_NAMESPACE]) as ObjectMeta;
  }

  setMeta(meta: ObjectMeta): void {
    this._setRaw([META_NAMESPACE], this.encode(meta));
  }

  isDeleted(): boolean {
    const value = this._getRaw([SYSTEM_NAMESPACE, 'deleted']);
    return typeof value === 'boolean' ? value : false;
  }

  setDeleted(value: boolean): void {
    this._setRaw([SYSTEM_NAMESPACE, 'deleted'], value);
  }

  /**
   * DXNs of objects that this object strongly depends on.
   * Strong references are loaded together with the source object.
   * Currently this is the schema reference and the source and target for relations.
   */
  getStrongDependencies(): DXN[] {
    const res: DXN[] = [];

    const type = this.getType();
    if (type && type.kind === DXN.kind.ECHO) {
      res.push(type);
    }

    if (this.getKind() === EntityKind.Relation) {
      const source = this.getSource();
      if (source) {
        res.push(source);
      }
      const target = this.getTarget();
      if (target) {
        res.push(target);
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

// TODO(burdon): Move to echo-protocol.
const maybeReference = (value: unknown) =>
  typeof value === 'object' &&
  value !== null &&
  Object.keys(value).length === 3 &&
  'objectId' in value && // TODO(burdon): 'objectId'
  'protocol' in value &&
  'host' in value;
