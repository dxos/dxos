//
// Copyright 2024 DXOS.org
//

import { Event } from '@dxos/async';
import { next as A, type ChangeFn, type ChangeOptions, type Doc, type Heads } from '@dxos/automerge/automerge';
import { type DocHandleChangePayload, type DocHandle } from '@dxos/automerge/automerge-repo';
import { compositeRuntime } from '@dxos/echo-signals/runtime';
import { failedInvariant, invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';

import { type AutomergeDb } from './automerge-db';
import { type DocStructure, type ObjectStructure } from './types';
import { type EchoObject } from '../object';

// TODO(dmaretskyi): Rename to `AutomergeObject`.
export class AutomergeObjectCore {
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
      this.docHandle.change((newDoc: DocStructure) => {
        assignDeep(newDoc, this.mountPath, doc);
      });
    }

    // TODO(dmaretskyi): Cleanup this subscription.
    this.docHandle.on('change', (event) => {
      if (objectIsUpdated(this.id, event)) {
        // Updates must come in the next microtask since the object state is not fully updated at the time of "change" event processing.
        // Update listeners might access the state of the object and it must be fully updated at that time.
        // It's ok to use `queueMicrotask` here since this path is only used for propagation of remote changes.
        queueMicrotask(() => {
          // TODO(dmaretskyi): Local changes have already called `notifyUpdate` so this would fire the notification twice for local updates.
          this.notifyUpdate();
        });
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
    if (this.doc) {
      if (options) {
        this.doc = A.change(this.doc!, options, changeFn);
      } else {
        this.doc = A.change(this.doc!, changeFn);
      }
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
            this.docHandle?.on('change', listener);
            this.updates.on(listener);
          }
        },
        removeListener: (event, listener) => {
          if (event === 'change') {
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

  public subscribeToDocHandleChanges() {
    invariant(this.docHandle);
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
