//
// Copyright 2020 DXOS.org
//

import { type ItemID } from '@dxos/protocols';

import { Item } from './item';
import { coerceToId, type OneOrMultiple } from './util';

// TODO(burdon): Are these deprecated? Incl. Item?

//
// Types
//

export type ItemIdFilter = {
  id: ItemID;
};

export type ItemFilter = {
  type?: OneOrMultiple<string>;
  parent?: ItemID | Item;
};

export type Predicate<T extends Item> = (entity: T) => boolean;

export type RootFilter = ItemIdFilter | ItemFilter | Predicate<Item>;

/**
 * Visitor callback.
 * The visitor is passed the current entities and result (accumulator),
 * which may be modified and returned.
 */
export type Callable<T extends Item, R> = (entities: T[], result: R) => R;

/**
 * Controls how deleted items are filtered.
 */
export enum ShowDeletedOption {
  /**
   * Do not return deleted items. Default behaviour.
   */
  HIDE_DELETED = 0,
  /**
   * Return deleted and regular items.
   */
  SHOW_DELETED = 1,
  /**
   * Return only deleted items.
   */
  SHOW_DELETED_ONLY = 2,
}

export type QueryOptions = {
  /**
   * Controls how deleted items are filtered.
   */
  deleted?: ShowDeletedOption;

  /**
   * Filter by model.
   * @default * Only DocumentModel.
   */
  models?: string[] | null;
};

export const QUERY_ALL_MODELS = null;

//
// Filters
//

export const filterToPredicate = (filter: ItemFilter | ItemIdFilter | Predicate<any>): Predicate<any> => {
  if (typeof filter === 'function') {
    return filter;
  }

  return itemFilterToPredicate(filter);
};

export const itemFilterToPredicate = (filter: ItemFilter | ItemIdFilter): Predicate<Item> => {
  if ('id' in filter) {
    return (item) => item.id === filter.id;
  } else {
    return (item) =>
      // (!filter.type || testOneOrMultiple(filter.type, item.type)) &&
      !filter.parent || item.parent === coerceToId(filter.parent);
  }
};

// TODO(burdon): Not referenced.
export const createQueryOptionsFilter =
  ({ deleted = ShowDeletedOption.HIDE_DELETED }: QueryOptions): Predicate<Item> =>
  (entity) => {
    // if (entity.model === null) {
    //   return false;
    // }

    switch (deleted) {
      case ShowDeletedOption.HIDE_DELETED:
        return !(entity instanceof Item) || !entity.deleted;
      case ShowDeletedOption.SHOW_DELETED:
        return true;
      case ShowDeletedOption.SHOW_DELETED_ONLY:
        return entity instanceof Item && entity.deleted;
    }
  };
