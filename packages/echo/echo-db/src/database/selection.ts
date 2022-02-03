//
// Copyright 2020 DXOS.org
//

import { Event } from '@dxos/async';
import { ItemID } from '@dxos/echo-protocol';

import { Database, DefaultModel } from '.';
import { Entity } from './entity';
import { Item } from './item';
import { Link } from './link';

export type OneOrMultiple<T> = T | T[];

export interface ItemFilter {
  type?: OneOrMultiple<string>;
  parent?: ItemID | Item<any>
}

export interface LinkFilter {
  type?: OneOrMultiple<string>;
}

export type Predicate<T> = (element: T) => boolean;

export interface ItemIdFilter {
  id: ItemID
}

export type RootFilter = ItemIdFilter | ItemFilter | Predicate<Item<any>>;

export type RootSelector = (filter?: RootFilter) => Selection<Item<any>[]>;

export function createRootSelector (getItems: () => Item<any>[], getUpdateEvent: () => Event<Entity<any>[]>, root: SelectionRoot): RootSelector {
  return (filter?: RootFilter): Selection<any> => {
    const predicate = filter ? filterToPredicate(filter) : () => true;
    return new Selection(options => getItems().filter(createQueryOptionsFilter(options)).filter(predicate), getUpdateEvent(), root);
  };
}

export function createItemSelector (root: Item<any>, update: Event<Entity<any>[]>): Selection<Item<any>[]> {
  return new Selection(() => [root], update, root);
}

export type SelectionRoot = Database | Entity<any>;

export enum ItemFilterDeleted {
  IGNORE_DELETED = 0,
  SHOW_DELETED = 1,
  SHOW_DELETED_ONLY = 2
}

export interface QueryOptions {
  deleted?: ItemFilterDeleted
}

export class Selection<T> {
  /**
   *
   * @param _run Execute the query.
   * @param _updateFilter Predicate to determine if the update event should be fired based on the set of changed items.
   * @param _update The unfiltered update event.
   * @param _root The root of the selection. Must be a stable reference.
   */
  constructor (
    private readonly _run: (options: QueryOptions) => T,
    private readonly _update: Event<Entity<any>[]>,
    private readonly _root: SelectionRoot
  ) {}

  query (options: QueryOptions = {}): SelectionResult<T> {
    return new SelectionResult<T>(() => this._run(options), this._update, this._root);
  }

  private _derive<U> (map: (arg: T, options: QueryOptions) => U): Selection<U> {
    return new Selection(options => map(this._run(options), options), this._update, this._root);
  }

  filter(this: Selection<Item<any>[]>, filter: ItemFilter): Selection<Item<any>[]>
  filter<U>(this: Selection<U[]>, filter: Predicate<U>): Selection<U[]>
  filter<U> (this: Selection<U[]>, filter: Predicate<T> | ItemFilter): Selection<U[]> {
    const predicate = filterToPredicate(filter);
    return this._derive(items => items.filter(predicate));
  }

  children (this: Selection<Item<any>[]>): Selection<Item<any>[]> {
    return this._derive((item, options) => item.flatMap(item => Array.from(item._children.values()).filter(createQueryOptionsFilter(options))));
  }

  links (this: Selection<Item<any>[]>, filter: LinkFilter = {}): Selection<Link<any>[]> {
    const predicate = linkFilterToPredicate(filter);
    return this._derive((item, options) => item.flatMap(item => item.links.filter(predicate).filter(createQueryOptionsFilter(options))));
  }

  targets (this: Selection<Link<any>[]>, filter: ItemFilter = {}): Selection<Item<any>[]> {
    const predicate = filterToPredicate(filter);
    return this._derive((links, options) => links.flatMap(link => link.target).filter(predicate).filter(createQueryOptionsFilter(options)));
  }
}

export class SelectionResult<T> {
  /**
   * Fired when there are updates in the selection. Only update that are relevant to the selection cause the update.
   */
  readonly update = new Event<T>();

  private _lastResult: T;

  constructor (
    private readonly _run: () => T,
    private readonly _update: Event<Entity<any>[]>,
    private readonly _root: SelectionRoot
  ) {
    this._lastResult = this._run();
    this.update.addEffect(() => _update.on(entities => {
      const result = this._run();
      const set = new Set([
        ...(Array.isArray(result) ? result : [result]),
        ...(Array.isArray(this._lastResult) ? this._lastResult : [this._lastResult])
      ]);
      this._lastResult = result;

      if (entities.some(entity => set.has(entity))) {
        this.update.emit(result);
      }
    }));
  }

  /**
   * Result of the selection.
   */
  get result (): T {
    return this._run();
  }

  /**
   * The root of the selection. Must be a stable reference.
   */
  get root (): SelectionRoot {
    return this._root;
  }
}

function coerseToId (item: Item<any> | ItemID): ItemID {
  if (typeof item === 'string') {
    return item;
  }

  return item.id;
}

function testOneOrMultiple<T> (expected: OneOrMultiple<T>, value: T) {
  if (Array.isArray(expected)) {
    return expected.includes(value);
  } else {
    return expected === value;
  }
}

function filterToPredicate (filter: ItemFilter | ItemIdFilter | Predicate<any>): Predicate<any> {
  if (typeof filter === 'function') {
    return filter;
  }

  return itemFilterToPredicate(filter);
}

function itemFilterToPredicate (filter: ItemFilter | ItemIdFilter): Predicate<Item<any>> {
  if ('id' in filter) {
    return item => item.id === filter.id;
  } else {
    return item => (!filter.type || testOneOrMultiple(filter.type, item.type)) &&
      (!filter.parent || item.parent?.id === coerseToId(filter.parent));
  }
}

function linkFilterToPredicate (filter: LinkFilter): Predicate<Link<any>> {
  return link => (!filter.type || testOneOrMultiple(filter.type, link.type));
}

function createQueryOptionsFilter ({ deleted = ItemFilterDeleted.IGNORE_DELETED }: QueryOptions): Predicate<Entity<any>> {
  return entity => {
    if (entity.model instanceof DefaultModel) {
      return false;
    }

    switch (deleted) {
      case ItemFilterDeleted.IGNORE_DELETED:
        return !(entity instanceof Item) || !entity.deleted;
      case ItemFilterDeleted.SHOW_DELETED:
        return true;
      case ItemFilterDeleted.SHOW_DELETED_ONLY:
        return entity instanceof Item && entity.deleted;
    }
  };
}
