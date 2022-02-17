//
// Copyright 2020 DXOS.org
//

import assert from 'assert';

import { Event } from '@dxos/async';
import { ItemID } from '@dxos/echo-protocol';

import { Database } from './database';
import { Entity } from './entity';
import { Item } from './item';
import { Link } from './link';

export type OneOrMultiple<T> = T | T[];

export type ItemFilter = {
  type?: OneOrMultiple<string>
  parent?: ItemID | Item<any>
}

export type LinkFilter = {
  type?: OneOrMultiple<string>;
}

export type Predicate<T> = (element: T) => boolean;

export type ItemIdFilter = {
  id: ItemID
}

export type RootFilter = ItemIdFilter | ItemFilter | Predicate<Item<any>>

export type RootSelector = (filter?: RootFilter) => Selection<Item<any>>

export const createRootSelector = (getItems: () => Item<any>[], getUpdateEvent: () => Event<Entity<any>[]>, root: SelectionRoot): RootSelector => {
  return (filter?: RootFilter): Selection<any> => {
    const predicate = filter ? filterToPredicate(filter) : () => true;
    return new Selection(options => getItems().filter(createQueryOptionsFilter(options)).filter(predicate), getUpdateEvent(), root);
  };
};

export const createItemSelector = (root: Item<any>, update: Event<Entity<any>[]>): Selection<Item<any>> =>
  new Selection(() => [root], update, root);

/**
 * Represents where the selection has started.
 */
export type SelectionRoot = Database | Entity<any>;

/**
 * Controls how deleted items are filtered.
 */
export enum ItemFilterDeleted {
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
  SHOW_DELETED_ONLY = 2
}

export type QueryOptions = {
  /**
   * Controls how deleted items are filtered.
   */
  deleted?: ItemFilterDeleted
}

/**
 * Selection is a DSL building queries into an ECHO database.
 */
export class Selection<T extends Entity<any>> {
  /**
   *
   * @param _execute Execute the query.
   * @param _updateFilter Predicate to determine if the update event should be fired based on the set of changed items.
   * @param _update The unfiltered update event.
   * @param _root The root of the selection. Must be a stable reference.
   */
  constructor (
    private readonly _execute: (options: QueryOptions) => T[],
    private readonly _update: Event<Entity<any>[]>,
    private readonly _root: SelectionRoot
  ) {}

  /**
   * Finish the selection and return the result.
   */
  query (options: QueryOptions = {}): SelectionResult<T> {
    return new SelectionResult<T>(() => this._execute(options), this._update, this._root);
  }

  /**
   * Creates a derrived selection by aplying a mapping function to the result of the current selection.
   */
  private _createSubSelection<U extends Entity<any>> (map: (arg: T[], options: QueryOptions) => U[]): Selection<U> {
    return new Selection(options => map(this._execute(options), options), this._update, this._root);
  }

  /**
   * The root of the selection. Either a database or an item. Must be a stable reference.
   */
  get root (): SelectionRoot {
    return this._root;
  }

  /**
   * Filter entities of this selection.
   * @param filter A filter object or a predicate function.
   */
  filter(this: Selection<Item<any>>, filter: ItemFilter): Selection<Item<any>>
  filter<U extends Entity<any>>(this: Selection<U>, filter: Predicate<U>): Selection<U>
  filter<U extends Entity<any>> (this: Selection<U>, filter: Predicate<T> | ItemFilter): Selection<U> {
    const predicate = filterToPredicate(filter);
    return this._createSubSelection(items => items.filter(predicate));
  }

  /**
   * Select children of the items in this selection.
   */
  children (this: Selection<Item<any>>): Selection<Item<any>> {
    return this._createSubSelection((item, options) => item.flatMap(item => Array.from(item._children.values()).filter(createQueryOptionsFilter(options))));
  }

  /**
   * Select links sourcing from the items in this selection.
   */
  links (this: Selection<Item<any>>, filter: LinkFilter = {}): Selection<Link<any>> {
    const predicate = linkFilterToPredicate(filter);
    return this._createSubSelection((item, options) => item.flatMap(item => item.links.filter(predicate).filter(createQueryOptionsFilter(options))));
  }

  /**
   * Select links pointing to items in this selection.
   */
  refs (this: Selection<Item<any>>, filter: LinkFilter = {}): Selection<Link<any>> {
    const predicate = linkFilterToPredicate(filter);
    return this._createSubSelection((item, options) => item.flatMap(item => item.refs.filter(predicate).filter(createQueryOptionsFilter(options))));
  }

  /**
   * Select targets of links in this selection.
   */
  target (this: Selection<Link<any>>, filter: ItemFilter = {}): Selection<Item<any>> {
    const predicate = filterToPredicate(filter);
    return this._createSubSelection((links, options) => links.flatMap(link => link.target).filter(predicate).filter(createQueryOptionsFilter(options)));
  }

  /**
   * Select sources of links in this selection.
   */
  source (this: Selection<Link<any>>, filter: ItemFilter = {}): Selection<Item<any>> {
    const predicate = filterToPredicate(filter);
    return this._createSubSelection((links, options) => links.flatMap(link => link.source).filter(predicate).filter(createQueryOptionsFilter(options)));
  }
}

/**
 * Represents a live-query that can notify about future updates to the relevant subset of items.
 */
export class SelectionResult<T extends Entity<any>> {
  /**
   * Fired when there are updates in the selection. Only update that are relevant to the selection cause the update.
   */
  readonly update = new Event<T[]>();

  private _lastResult: T[];

  constructor (
    private readonly _execute: () => T[],
    private readonly _update: Event<Entity<any>[]>,
    private readonly _root: SelectionRoot
  ) {
    this._lastResult = this._execute();
    this.update.addEffect(() => _update.on(entities => {
      const result = this._execute();
      const set = new Set([...result, ...this._lastResult]);
      this._lastResult = result;

      if (entities.some(entity => set.has(entity as any))) {
        this.update.emit(result);
      }
    }));
  }

  /**
   * Get the result of this select.
   */
  get result (): T[] {
    return dedup(this._execute());
  }

  /**
   * If the result contains exatly one entity, returns it, errors otherwise.
   */
  expectOne (): T {
    const res = this.result;
    assert(res.length === 1, 'Expected one result, got ' + res.length);
    return res[0];
  }

  /**
   * The root of the selection. Either a database or an item. Must be a stable reference.
   */
  get root (): SelectionRoot {
    return this._root;
  }
}

const coerceToId = (item: Item<any> | ItemID): ItemID => {
  if (typeof item === 'string') {
    return item;
  }

  return item.id;
};

const testOneOrMultiple = <T>(expected: OneOrMultiple<T>, value: T) => {
  if (Array.isArray(expected)) {
    return expected.includes(value);
  } else {
    return expected === value;
  }
};

const filterToPredicate = (filter: ItemFilter | ItemIdFilter | Predicate<any>): Predicate<any> => {
  if (typeof filter === 'function') {
    return filter;
  }

  return itemFilterToPredicate(filter);
};

const itemFilterToPredicate = (filter: ItemFilter | ItemIdFilter): Predicate<Item<any>> => {
  if ('id' in filter) {
    return item => item.id === filter.id;
  } else {
    return item =>
      (!filter.type || testOneOrMultiple(filter.type, item.type)) &&
      (!filter.parent || item.parent?.id === coerceToId(filter.parent));
  }
};

const linkFilterToPredicate = (filter: LinkFilter): Predicate<Link<any>> =>
  link => (!filter.type || testOneOrMultiple(filter.type, link.type));

const createQueryOptionsFilter = ({ deleted = ItemFilterDeleted.HIDE_DELETED }: QueryOptions): Predicate<Entity<any>> => {
  return entity => {
    if (entity.model === null) {
      return false;
    }

    switch (deleted) {
      case ItemFilterDeleted.HIDE_DELETED:
        return !(entity instanceof Item) || !entity.deleted;
      case ItemFilterDeleted.SHOW_DELETED:
        return true;
      case ItemFilterDeleted.SHOW_DELETED_ONLY:
        return entity instanceof Item && entity.deleted;
    }
  };
};

const dedup = <T>(arr: T[]) => Array.from(new Set(arr));
