//
// Copyright 2024 DXOS.org
//

import { Event } from '@dxos/async';
import { next as A, type ChangeFn, type ChangeOptions, type Doc, type Heads } from '@dxos/automerge/automerge';
import { type DocHandleChangePayload, type DocHandle } from '@dxos/automerge/automerge-repo';
import { Reference } from '@dxos/echo-db';
import { type ObjectStructure, type SpaceDoc } from '@dxos/echo-pipeline';
import { compositeRuntime } from '@dxos/echo-signals/runtime';
import { failedInvariant, invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log'; // Keep type-only.
import { assignDeep, defer, getDeep } from '@dxos/util';

import { AutomergeArray } from './automerge-array';
import { type AutomergeDb } from './automerge-db';
import { AutomergeObject, getAutomergeObjectCore } from './automerge-object';
import { type DocAccessor } from './automerge-types';
import { docChangeSemaphore } from './doc-semaphore';
import { type KeyPath, isValidKeyPath } from './key-path';
import {
  encodeReference,
  isEncodedReferenceObject,
  decodeReference,
  type DecodedAutomergeValue,
  type DecodedAutomergePrimaryValue,
} from './types';
import { isReactiveProxy } from '../effect/proxy';
import { isEchoReactiveObject } from '../effect/reactive';
import { type TypedObjectOptions, type EchoObject, TextObject, type OpaqueEchoObject } from '../object';
import { AbstractEchoObject } from '../object/object';
import { type Schema } from '../proto';

// Strings longer than this will have collaborative editing disabled for performance reasons.
const STRING_CRDT_LIMIT = 300_000;

const SYSTEM_NAMESPACE = 'system';

/**
 * @deprecated
 */
const TEXT_MODEL_TYPE = 'dxos.org/model/text';

// TODO(dmaretskyi): Rename to `AutomergeObject`.
export class AutomergeObjectCore {
  // TODO(dmaretskyi): Start making some of those fields private.

  /**
   * Id of the ECHO object.
   */
  public id = PublicKey.random().toHex();

  // TODO(dmaretskyi): Create a discriminated union for the bound/not bound states.

  /**
   * Set if when the object is bound to a database.
   */
  public database?: AutomergeDb | undefined;

  /**
   * Set if when the object is not bound to a database.
   */
  public doc?: Doc<ObjectStructure> | undefined;

  /**
   * Set if when the object is bound to a database.
   */
  public docHandle?: DocHandle<SpaceDoc> = undefined;

  /**
   * Until object is persisted in the database, the linked object references are stored in this cache.
   * Set only when the object is not bound to a database.
   */
  // TODO(dmaretskyi): Change to object core.
  public linkCache?: Map<string, EchoObject> = new Map<string, EchoObject>();

  /**
   * Key path at where we are mounted in the `doc` or `docHandle`.
   * The value at path must be of type `ObjectStructure`.
   */
  public mountPath: KeyPath = [];

  /**
   * Handles link resolution as well as manual changes.
   */
  public updates = new Event();

  /**
   * Reactive signal for update propagation.
   */
  public signal = compositeRuntime.createSignal(this);

  /**
   * User-facing proxy for the object.
   * Either an instance of `AutomergeObject` or a `ReactiveEchoObject<T>`.
   */
  public rootProxy: unknown;

  /**
   * Create local doc with initial state from this object.
   */
  initNewObject(initialProps?: unknown, opts?: TypedObjectOptions) {
    invariant(!this.docHandle && !this.doc);

    initialProps ??= {};

    // Init schema defaults.
    if (opts?.schema) {
      for (const field of opts.schema.props) {
        if (field.repeated) {
          (initialProps as Record<string, any>)[field.id!] ??= [];
        } else if (field.type === getSchemaProto().PropType.REF && field.refModelType === TEXT_MODEL_TYPE) {
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
        this.linkObject(obj);
      }

      this.linkCache = undefined;
    }

    const doc = this.doc;
    this.doc = undefined;

    if (options.assignFromLocalState) {
      invariant(doc, 'assignFromLocalState');

      // Prevent recursive change calls.
      using _ = defer(docChangeSemaphore(this.docHandle ?? this));

      this.docHandle.change((newDoc: SpaceDoc) => {
        assignDeep(newDoc, this.mountPath, doc);
      });
    }

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
      // Note: We don't need to notify listeners here, since `change` event is already processed by DB.
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
      // Note: We don't need to notify listeners here, since `change` event is already processed by DB.
    }

    return result;
  }

  getDocAccessor(path: KeyPath = []): DocAccessor {
    invariant(isValidKeyPath(path));
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
      log.catch(err);

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
  linkObject(obj: OpaqueEchoObject): Reference {
    if (this.database) {
      // TODO(dmaretskyi): Fix this.
      if (isReactiveProxy(obj) && !isEchoReactiveObject(obj)) {
        invariant(this.database, 'BUG');
        this.database._dbApi.add(obj);
      }

      const core = getAutomergeObjectCore(obj);

      if (!core.database) {
        this.database.add(obj);
        return new Reference(core.id);
      } else {
        if ((core.database as any) !== this.database) {
          return new Reference(core.id, undefined, core.database.spaceKey.toHex());
        } else {
          return new Reference(core.id);
        }
      }
    } else {
      invariant(this.linkCache);
      this.linkCache.set(obj.id, obj as EchoObject);
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
  encode(value: DecodedAutomergeValue, options: { allowLinks?: boolean; removeUndefined?: boolean } = {}) {
    const allowLinks = options.allowLinks ?? true;
    const removeUndefined = options.removeUndefined ?? false;
    if (value instanceof A.RawString) {
      return value;
    }
    if (value === undefined) {
      return null;
    }
    // TODO(dmaretskyi): Move proxy handling out of this class.
    if (
      value instanceof AbstractEchoObject ||
      value instanceof AutomergeObject ||
      (isReactiveProxy(value) as boolean)
    ) {
      if (!allowLinks) {
        throw new TypeError('Linking is not allowed');
      }

      const reference = this.linkObject(value as OpaqueEchoObject);
      return encodeReference(reference);
    }
    if (value instanceof Reference) {
      // TODO(mykola): Delete this once we clean up Reference 'protobuf' protocols types.
      return encodeReference(value);
    }
    if (value instanceof AutomergeArray || Array.isArray(value)) {
      const values: any = value.map((val) => this.encode(val, options));
      return values;
    }
    if (typeof value === 'object' && value !== null) {
      const entries = removeUndefined
        ? Object.entries(value).filter(([_, value]) => value !== undefined)
        : Object.entries(value);
      return Object.fromEntries(entries.map(([key, value]): [string, any] => [key, this.encode(value, options)]));
    }

    if (typeof value === 'string' && value.length > STRING_CRDT_LIMIT) {
      return new A.RawString(value);
    }

    return value;
  }

  /**
   * Decode a value from the Automerge document.
   */
  // TODO(dmaretskyi): Cleanup to not do resolution in this method.
  decode(value: any, { resolveLinks = true }: { resolveLinks?: boolean } = {}): DecodedAutomergeValue {
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
    if (isEncodedReferenceObject(value) || looksLikeReferenceObject(value)) {
      if (value.protocol === 'protobuf') {
        // TODO(mykola): Delete this once we clean up Reference 'protobuf' protocols types.
        // TODO(dmaretskyi): Why are we returning raw reference here instead of doing lookup?
        return decodeReference(value);
      }

      const reference = decodeReference(value);

      if (resolveLinks) {
        return this.lookupLink(reference);
      } else {
        return reference;
      }
    }
    if (typeof value === 'object') {
      return Object.fromEntries(Object.entries(value).map(([key, value]): [string, any] => [key, this.decode(value)]));
    }

    return value;
  }

  /**
   * @deprecated Use getDecoded.
   */
  get(path: KeyPath) {
    const fullPath = [...this.mountPath, ...path];

    let value = this.getDoc();
    for (const key of fullPath) {
      value = value?.[key];
    }

    return value;
  }

  /**
   * @deprecated Use setDecoded.
   */
  set(path: KeyPath, value: any) {
    const fullPath = [...this.mountPath, ...path];

    this.change((doc) => {
      assignDeep(doc, fullPath, value);
    });
  }

  // TODO(dmaretskyi): Rename to `get`.
  getDecoded(path: KeyPath): DecodedAutomergePrimaryValue {
    return this.decode(this.get(path), { resolveLinks: false }) as DecodedAutomergePrimaryValue;
  }

  // TODO(dmaretskyi): Rename to `set`.
  setDecoded(path: KeyPath, value: DecodedAutomergePrimaryValue) {
    this.set(path, this.encode(value, { allowLinks: false }));
  }

  setType(reference: Reference) {
    this.set([SYSTEM_NAMESPACE, 'type'], this.encode(reference));
  }

  delete(path: KeyPath) {
    const fullPath = [...this.mountPath, ...path];

    this.change((doc) => {
      const value: any = getDeep(doc, fullPath.slice(0, fullPath.length - 1));
      delete value[fullPath[fullPath.length - 1]];
    });
  }

  getType(): Reference | undefined {
    const value = this.decode(this.get([SYSTEM_NAMESPACE, 'type']), { resolveLinks: false });
    if (!value) {
      return undefined;
    }

    invariant(value instanceof Reference);
    return value;
  }

  isDeleted() {
    const value = this.get([SYSTEM_NAMESPACE, 'deleted']);
    return typeof value === 'boolean' ? value : false;
  }

  setDeleted(value: boolean) {
    this.set([SYSTEM_NAMESPACE, 'deleted'], value);
  }
}

export type BindOptions = {
  db: AutomergeDb;
  docHandle: DocHandle<SpaceDoc>;
  path: KeyPath;

  /**
   * Assign the state from the local doc into the shared structure for the database.
   */
  assignFromLocalState?: boolean;
};

export const objectIsUpdated = (objId: string, event: DocHandleChangePayload<SpaceDoc>) => {
  if (event.patches.some((patch) => patch.path[0] === 'objects' && patch.path[1] === objId)) {
    return true;
  }
  return false;
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

const looksLikeReferenceObject = (value: unknown) =>
  typeof value === 'object' &&
  value !== null &&
  Object.keys(value).length === 3 &&
  'itemId' in value &&
  'protocol' in value &&
  'host' in value;
