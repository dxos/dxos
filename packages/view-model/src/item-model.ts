import { createId } from '@dxos/crypto';
// TODO(burdon): Remove dependency (via adapter). Or move to other package.
import { Model } from '@dxos/model-factory';

import { raise } from './util';

// TODO(marik-d): Reuse existing ObjectModel mutation mechanisms and CRDTs
export interface ItemMutation {
  ['__type_url']: string
  itemId: string
  displayName?: string
  deleted?: boolean
  metadata?: Record<string, any>
}

export interface Item<M extends {} = {}> {
  type: string
  itemId: string
  displayName: string
  deleted: boolean
  metadata: M
}

export class ItemModel<M extends {} = {}> extends Model {
  private readonly _items = new Map<string, Item<M>>()

  getById (itemId: string): Item<M> | undefined {
    return this._items.get(itemId);
  }

  getAllItems (): Item<M>[] {
    return Array.from(this._items.values()).filter(item => !item.deleted);
  }

  getAllDeletedItems (): Item<M>[] {
    return Array.from(this._items.values()).filter(item => item.deleted);
  }

  getAllForType (type: string): Item<M>[] {
    const res: Item<M>[] = [];
    for (const item of this._items.values()) {
      if (item.type === type && !item.deleted) {
        res.push(item);
      }
    }
    return res;
  }

  onUpdate (messages: ItemMutation[]) {
    for (const message of messages) {
      const item = this.getById(message.itemId);
      if (item) {
        this._items.set(message.itemId, {
          ...item,
          displayName: message.displayName ?? item.displayName,
          deleted: message.deleted ?? item.deleted,
          metadata: {
            ...item.metadata,
            ...message.metadata
          }
        });
      } else {
        this._items.set(message.itemId, {
          type: message.__type_url,
          itemId: message.itemId,
          displayName: message.displayName ?? message.itemId,
          deleted: message.deleted ?? false,
          metadata: (message.metadata ?? {}) as M
        });
      }
    }
  }

  createItem (type: string, displayName: string, metadata: M = {} as any): string {
    const itemId = createId();
    super.appendMessage({ __type_url: type, itemId, displayName, metadata });
    return itemId;
  }

  renameItem (itemId: string, displayName: string) {
    const item = this.getById(itemId) ?? raise(new Error(`Item not found for id: ${itemId}`));
    if (item.deleted) throw new Error(`Cannot rename deleted item with id: ${itemId}`);
    super.appendMessage({ itemId, __type_url: item.type, displayName });
  }

  updateItem (itemId: string, metadata: Partial<M>) {
    const item = this.getById(itemId) ?? raise(new Error(`Item not found for id: ${itemId}`));
    if (item.deleted) throw new Error(`Cannot update deleted item with id: ${itemId}`);
    super.appendMessage({ itemId, __type_url: item.type, metadata });
  }

  deleteItem (itemId: string) {
    const item = this.getById(itemId) ?? raise(new Error(`Item not found for id: ${itemId}`));
    if (item.deleted) return;
    super.appendMessage({ itemId, __type_url: item.type, deleted: true });
  }

  restoreItem (itemId: string) {
    const item = this.getById(itemId) ?? raise(new Error(`Item not found for id: ${itemId}`));
    if (!item.deleted) return;
    super.appendMessage({ itemId, __type_url: item.type, deleted: false });
  }
}
