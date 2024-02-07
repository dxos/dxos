//
// Copyright 2024 DXOS.org
//

import { Event } from '@dxos/async';
import { next as A, type ChangeFn, type ChangeOptions, type Doc, type Heads } from '@dxos/automerge/automerge';
import { type DocHandleChangePayload, type DocHandle } from '@dxos/automerge/automerge-repo';
import { Reference } from '@dxos/document-model';
import { compositeRuntime } from '@dxos/echo-signals/runtime';
import { failedInvariant, invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { defer } from '@dxos/util';

import { AutomergeArray } from './automerge-array';
import { type AutomergeDb } from './automerge-db';
import { AutomergeObject } from './automerge-object';
import { docChangeSemaphore } from './doc-semaphore';
import {
  encodeReference,
  type DocStructure,
  type ObjectStructure,
  isEncodedReferenceObject,
  decodeReference,
  type DecodedAutomergeValue,
} from './types';
import { base, TypedObjectOptions, type EchoObject, TextObject } from '../object';
import { AbstractEchoObject } from '../object/object';
import { type Schema } from '../proto'; // Keep type-only
import { TextModel } from '@dxos/text-model';

// Strings longer than this will have collaborative editing disabled for performance reasons.
const STRING_CRDT_LIMIT = 300_000;

// TODO(dmaretskyi): Rename to `AutomergeObject`.
export class AutomergeObjectCore {
  // TODO(dmaretskyi): Start making some of those fields private.

  /**
   * Id of the ECHO object.
   */
  public id = PublicKey.random().toHex();

  // TODO(dmaretskyi): Create a discriminated union for the bound/not bound states.

  /**
   * Set if when the object is not bound to a database.
   */
  public database?: AutomergeDb | undefined;

  /**
   * Set if when the object is not bound to a database.
   */
  public doc?: Doc<ObjectStructure> | undefined;

  /**
   * Set if when the object is bound to a database.
   */
  public docHandle?: DocHandle<DocStructure> = undefined;

  /**
   * Until object is persisted in the database, the linked object references are stored in this cache.
   * Set only when the object is not bound to a database.
   */
  public linkCache?: Map<string, EchoObject> = new Map<string, EchoObject>();

  /**
   * Key path at where we are mounted in the `doc` or `docHandle`.
   * The value at path must be of type `ObjectStructure`.
   */
  public mountPath: string[] = [];

  /**
   * Handles link resolution as well as manual changes.
   */
  public updates = new Event();

  /**
   * Reactive signal for update propagation.
   */
  public signal = compositeRuntime.createSignal();

  /**
   * Create local doc with initial state from this object.
   */
  initNewObject(initialProps?: unknown, opts?: TypedObjectOptions) {
    invariant(!this.docHandle && !this.doc);

    initialProps ??= {};

    // Init schema defaults
    if (opts?.schema) {
      for (const field of opts.schema.props) {
        if (field.repeated) {
          (initialProps as Record<string, any>)[field.id!] ??= [];
        } else if (field.type === getSchemaProto().PropType.REF && field.refModelType === TextModel.meta.type) {
          // TODO(dmaretskyi): Is this right? Should we init with empty string or an actual reference to a Text object?
          (initialProps as Record<string, any>)[field.id!] ??= new TextObject();
        }
      }
    }

    this.doc = A.from<ObjectStructure>({
      data: this.encode(initialProps as any),
      meta: this.encode({
        keys: [],
        ...opts?.meta,
      }),
      system: {},
    });
  }

  bind(options: BindOptions) {
    this.database = options.db;
    this.docHandle = options.docHandle;
    this.mountPath = options.path;

    if (this.linkCache) {
      for (const obj of this.linkCache.values()) {
        this.database!.add(obj);
      }

      this.linkCache = undefined;
    }

    const doc = this.doc;
    this.doc = undefined;

    if (!options.ignoreLocalState) {
      // Prevent recursive change calls.
      using _ = defer(docChangeSemaphore(this.docHandle ?? this));

      this.docHandle.change((newDoc: DocStructure) => {
        assignDeep(newDoc, this.mountPath, doc);
      });
    }

    // TODO(dmaretskyi): Dispose this subscription.
    this.docHandle.on('change', (event) => {
      if (objectIsUpdated(this.id, event)) {
        this.notifyUpdate();
      }
    });

    this.notifyUpdate();
  }

  getDoc() {
    return this.doc ?? this.docHandle?.docSync() ?? failedInvariant('Invalid state');
  }

  /**
   * Do not take into account mountPath.
   */
  change(changeFn: ChangeFn<any>, options?: A.ChangeOptions<any>) {
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
      // Note: We don't need to notify listeners here, since `change` event is already emitted by the doc handle.
    }
  }

  /**
   * Do not take into account mountPath.
   */
  changeAt(heads: Heads, callback: ChangeFn<any>, options?: ChangeOptions<any>): string[] | undefined {
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
      // Note: We don't need to notify listeners here, since `change` event is already emitted by the doc handle.
    }

    return result;
  }

  getDocAccessor(path: string[] = []): DocAccessor {
    const self = this;
    return {
      handle: {
        docSync: () => this.getDoc(),
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

      isAutomergeDocAccessor: true,
    };
  }

  /**
   * Fire a synchronous update notification via signal and event subscriptions.
   * Called after local changes and link resolution.
   * This function can be used unbound.
   */
  public readonly notifyUpdate = () => {
    try {
      this.signal.notifyWrite();
      this.updates.emit();
    } catch (err) {
      // Print the error message synchronously for easier debugging.
      // The stack trace and details will be printed asynchronously.
      console.error('' + err);

      // Reports all errors that happen during even propagation as unhandled.
      // This is important since we don't want to silently swallow errors.
      // Unfortunately, this will only report errors in the next microtask after the current stack has already unwound.
      // TODO(dmaretskyi): Take some inspiration from facebook/react/packages/shared/invokeGuardedCallbackImpl.js
      queueMicrotask(() => {
        throw err;
      });
    }
  };

  /**
   * Store referenced object.
   */
  linkObject(obj: EchoObject): Reference {
    if (this.database) {
      if (!obj[base]._database) {
        this.database.add(obj);
        return new Reference(obj.id);
      } else {
        if ((obj[base]._database as any) !== this.database) {
          return new Reference(obj.id, undefined, obj[base]._database.spaceKey.toHex());
        } else {
          return new Reference(obj.id);
        }
      }
    } else {
      invariant(this.linkCache);
      this.linkCache.set(obj.id, obj);
      return new Reference(obj.id);
    }
  }

  /**
   * Lookup referenced object.
   */
  lookupLink(ref: Reference): EchoObject | undefined {
    if (this.database) {
      // This doesn't clean-up properly if the ref at key gets changed, but it doesn't matter since `_onLinkResolved` is idempotent.
      return this.database.graph._lookupLink(ref, this.database, this.notifyUpdate);
    } else {
      invariant(this.linkCache);
      return this.linkCache.get(ref.itemId);
    }
  }

  /**
   * Encode a value to be stored in the Automerge document.
   */
  encode(value: DecodedAutomergeValue) {
    if (value instanceof A.RawString) {
      return value;
    }
    if (value === undefined) {
      return null;
    }
    if (value instanceof AbstractEchoObject || value instanceof AutomergeObject) {
      const reference = this.linkObject(value);
      return encodeReference(reference);
    }
    if (value instanceof Reference && value.protocol === 'protobuf') {
      // TODO(mykola): Delete this once we clean up Reference 'protobuf' protocols types.
      return encodeReference(value);
    }
    if (value instanceof AutomergeArray || Array.isArray(value)) {
      const values: any = value.map((val) => {
        if (val instanceof AutomergeArray || Array.isArray(val)) {
          // TODO(mykola): Add support for nested arrays.
          throw new Error('Nested arrays are not supported');
        }
        return this.encode(val);
      });
      return values;
    }
    if (typeof value === 'object' && value !== null) {
      // TODO(dmaretskyi): Why do we freeze it?
      Object.freeze(value);
      return Object.fromEntries(Object.entries(value).map(([key, value]): [string, any] => [key, this.encode(value)]));
    }

    if (typeof value === 'string' && value.length > STRING_CRDT_LIMIT) {
      return new A.RawString(value);
    }

    return value;
  }

  /**
   * Decode a value from the Automerge document.
   */
  decode(value: any): DecodedAutomergeValue {
    if (value === null) {
      return undefined;
    }
    if (Array.isArray(value)) {
      return value.map((val) => this.decode(val));
    }
    if (value instanceof A.RawString) {
      return value.toString();
    }
    if (isEncodedReferenceObject(value)) {
      if (value.protocol === 'protobuf') {
        // TODO(mykola): Delete this once we clean up Reference 'protobuf' protocols types.
        // TODO(dmaretskyi): Why are we returning raw reference here instead of doing lookup?
        return decodeReference(value);
      }

      const reference = decodeReference(value);
      return this.lookupLink(reference);
    }
    if (typeof value === 'object') {
      return Object.fromEntries(Object.entries(value).map(([key, value]): [string, any] => [key, this.decode(value)]));
    }

    return value;
  }
}

export type DocAccessor<T = any> = {
  handle: IDocHandle<T>;

  path: string[];

  isAutomergeDocAccessor: true;
};

export type IDocHandle<T = any> = {
  docSync(): Doc<T> | undefined;
  change(callback: ChangeFn<T>, options?: ChangeOptions<T>): void;
  changeAt(heads: Heads, callback: ChangeFn<T>, options?: ChangeOptions<T>): string[] | undefined;

  addListener(event: 'change', listener: () => void): void;
  removeListener(event: 'change', listener: () => void): void;
};

export type BindOptions = {
  db: AutomergeDb;
  docHandle: DocHandle<DocStructure>;
  path: string[];

  /**
   * Discard the local state that the object held before binding.
   * Otherwise the local state will be assigned into the shared structure for the database.
   */
  ignoreLocalState?: boolean;
};

export const isDocAccessor = (obj: any): obj is DocAccessor => {
  return !!obj?.isAutomergeDocAccessor;
};

export const objectIsUpdated = (objId: string, event: DocHandleChangePayload<DocStructure>) => {
  if (event.patches.some((patch) => patch.path[0] === 'objects' && patch.path[1] === objId)) {
    return true;
  }
  return false;
};

/**
 * To be used inside doc.change callback to initialize a deeply nested object.
 * @returns The value of the prop after assignment.
 */
export const assignDeep = <T>(doc: any, path: string[], value: T): T => {
  invariant(path.length > 0);
  let parent = doc;
  for (const key of path.slice(0, -1)) {
    parent[key] ??= {};
    parent = parent[key];
  }
  parent[path.at(-1)!] = value;
  return parent[path.at(-1)!]; // NOTE: We can't just return value here since doc's getter might return a different object.
};

// Deferred import to avoid circular dependency.
let schemaProto: typeof Schema;
const getSchemaProto = (): typeof Schema => {
  if (!schemaProto) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Schema } = require('../proto');
    schemaProto = Schema;
  }

  return schemaProto;
};
