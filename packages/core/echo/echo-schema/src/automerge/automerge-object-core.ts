import { next as A, ChangeFn, ChangeOptions, Doc, Heads } from '@dxos/automerge/automerge';
import { AutomergeDb } from './automerge-db';
import { DocHandle } from '@dxos/automerge/automerge-repo';
import { DocStructure, ObjectStructure } from './types';
import { failedInvariant, invariant } from '@dxos/invariant';
import { Event } from '@dxos/async';

// TODO(dmaretskyi): Rename to `AutomergeObject`.
export class AutomergeObjectCore {
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
   * Fires after updates that come from the using the doc accessor.
   * NOTE: Does not capture all changes.
   */
  public onManualChange = new Event();

  /**
   * Handles link resolution as well as manual changes.
   */
  public updates = new Event();

  getDoc() {
    return this.doc ?? this.docHandle?.docSync() ?? failedInvariant('Invalid state');
  }

  getDocAccessor(path: string[] = []): DocAccessor {
    const self = this;
    return {
      handle: {
        docSync: () => this.getDoc(),
        change: (callback, options) => {
          if (this.doc) {
            if (options) {
              this.doc = A.change(this.doc!, options, callback);
            } else {
              this.doc = A.change(this.doc!, callback);
            }
            this.onManualChange.emit();
          } else {
            invariant(this.docHandle);
            this.docHandle.change(callback, options);
            // Note: We don't need to notify listeners here, since `change` event is already emitted by the doc handle.
          }
        },
        changeAt: (heads, callback, options) => {
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
            this.onManualChange.emit();
          } else {
            invariant(this.docHandle);
            result = this.docHandle.changeAt(heads, callback, options);
            // Note: We don't need to notify listeners here, since `change` event is already emitted by the doc handle.
          }

          return result;
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
