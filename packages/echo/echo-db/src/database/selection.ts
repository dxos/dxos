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
}

export const createItemSelector = (root: Item<any>, update: Event<Entity<any>[]>): Selection<Item<any>> =>
  new Selection(() => [root], update, root);

export type SelectionRoot = Database | Entity<any>;

export enum ItemFilterDeleted {
  IGNORE_DELETED = 0,
  SHOW_DELETED = 1,
  SHOW_DELETED_ONLY = 2
}

export type QueryOptions = {
  deleted?: ItemFilterDeleted
}

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

  query (options: QueryOptions = {}): SelectionResult<T> {
    return new SelectionResult<T>(this._root, () => this._execute(options), this._update);
  }

  private _createSubSelection<U extends Entity<any>> (map: (arg: T[], options: QueryOptions) => U[]): Selection<U> {
    return new Selection(options => map(this._execute(options), options), this._update, this._root);
  }

  filter(this: Selection<Item<any>>, filter: ItemFilter): Selection<Item<any>>
  filter<U extends Entity<any>>(this: Selection<U>, filter: Predicate<U>): Selection<U>
  filter<U extends Entity<any>> (this: Selection<U>, filter: Predicate<T> | ItemFilter): Selection<U> {
    const predicate = filterToPredicate(filter);
    return this._createSubSelection(items => items.filter(predicate));
  }

  children (this: Selection<Item<any>>): Selection<Item<any>> {
    return this._createSubSelection((item, options) => item.flatMap(item => Array.from(item._children.values()).filter(createQueryOptionsFilter(options))));
  }

  links (this: Selection<Item<any>>, filter: LinkFilter = {}): Selection<Link<any>> {
    const predicate = linkFilterToPredicate(filter);
    return this._createSubSelection((item, options) => item.flatMap(item => item.links.filter(predicate).filter(createQueryOptionsFilter(options))));
  }

  refs (this: Selection<Item<any>>, filter: LinkFilter = {}): Selection<Link<any>> {
    const predicate = linkFilterToPredicate(filter);
    return this._createSubSelection((item, options) => item.flatMap(item => item.refs.filter(predicate).filter(createQueryOptionsFilter(options))));
  }

  target (this: Selection<Link<any>>, filter: ItemFilter = {}): Selection<Item<any>> {
    const predicate = filterToPredicate(filter);
    return this._createSubSelection((links, options) => links.flatMap(link => link.target).filter(predicate).filter(createQueryOptionsFilter(options)));
  }

  source (this: Selection<Link<any>>, filter: ItemFilter = {}): Selection<Item<any>> {
    const predicate = filterToPredicate(filter);
    return this._createSubSelection((links, options) => links.flatMap(link => link.source).filter(predicate).filter(createQueryOptionsFilter(options)));
  }
}

export class SelectionResult<T extends Entity<any>> {
  /**
   * Fired when there are updates in the selection. Only update that are relevant to the selection cause the update.
   */
  readonly update = new Event<T[]>();

  private _lastResult: T[];

  constructor (
    private readonly _root: SelectionRoot,
    private readonly _execute: () => T[],
    private readonly _update: Event<Entity<any>[]>
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
   * Result of the selection.
   */
  get result (): T[] {
    return dedup(this._execute()) 
  }

  /**
   * The root of the selection. Must be a stable reference.
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
}

const testOneOrMultiple = <T>(expected: OneOrMultiple<T>, value: T) => {
  if (Array.isArray(expected)) {
    return expected.includes(value);
  } else {

    return expected === value;
  }
}

const filterToPredicate = (filter: ItemFilter | ItemIdFilter | Predicate<any>): Predicate<any> => {
  if (typeof filter === 'function') {
    return filter;
  }

  return itemFilterToPredicate(filter);
}

const itemFilterToPredicate = (filter: ItemFilter | ItemIdFilter): Predicate<Item<any>> => {
  if ('id' in filter) {
    return item => item.id === filter.id;
  } else {
    return item =>
      (!filter.type || testOneOrMultiple(filter.type, item.type)) &&
      (!filter.parent || item.parent?.id === coerceToId(filter.parent));
  }
}

const linkFilterToPredicate = (filter: LinkFilter): Predicate<Link<any>> => 
  link => (!filter.type || testOneOrMultiple(filter.type, link.type));

const createQueryOptionsFilter = ({ deleted = ItemFilterDeleted.IGNORE_DELETED }: QueryOptions): Predicate<Entity<any>> =>{
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

const dedup = <T>(arr: T[]) => Array.from(new Set(arr));