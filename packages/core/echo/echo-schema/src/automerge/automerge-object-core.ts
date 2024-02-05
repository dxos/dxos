//
// Copyright 2024 DXOS.org
//

import { Event } from '@dxos/async';
import { next as A, type ChangeFn, type ChangeOptions, type Doc, type Heads } from '@dxos/automerge/automerge';
import { type DocHandle } from '@dxos/automerge/automerge-repo';
import { failedInvariant, invariant } from '@dxos/invariant';

import { type AutomergeDb } from './automerge-db';
import { type DocStructure, type ObjectStructure } from './types';
import { PublicKey } from '@dxos/keys';
import { compositeRuntime } from '../util';
import { log } from '@dxos/log';

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

  getDoc() {
    return this.doc ?? this.docHandle?.docSync() ?? failedInvariant('Invalid state');
  }

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

  public readonly notifyUpdate = () => {
    try {
      this.signal.notifyWrite();
      this.updates.emit();
    } catch (err) {
      log.catch(err);
    }
  };
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

export const isDocAccessor = (obj: any): obj is DocAccessor => {
  return !!obj?.isAutomergeDocAccessor;
};
