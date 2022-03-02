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

export type RootFilter = ItemIdFilter | ItemFilter | Predicate<Item<any>>

export type RootSelector = (filter?: RootFilter) => Selection<Item<any>>

const dedupe = <T>(arr: T[]) => Array.from(new Set(arr));

/**
 * Factory for root item selector.
 * @param itemsProvider
 * @param updateEventProvider
 * @param root
 */
// TODO(burdon): Explain why providers are necessary.
export const createRootSelector = (
  itemsProvider: () => Item<any>[],
  updateEventProvider: () => Event<Entity<any>[]>,
  root: SelectionRoot
): RootSelector => {
  return (filter?: RootFilter): Selection<any> => {
    const predicate = filter ? filterToPredicate(filter) : () => true;
    const visitor = (options: QueryOptions): SelectionContext<any, any> => {
      const items = itemsProvider()
        .filter(createQueryOptionsFilter(options))
        .filter(predicate);

      return [items];
    }

    return new Selection(visitor, updateEventProvider(), root);
  };
};

/**
 * Factory for specific item selector.
 * @param root
 * @param update
 */
export const createItemSelector = (
  root: Item<any>,
  update: Event<Entity<any>[]>
): Selection<Item<any>> => new Selection(() => [[root]], update, root);

/**
 * Returned from each stage of the visitor.
 */
export type SelectionContext<T extends Entity, R> = [entities: T[], result?: R]

/**
 * Visitor callback.
 */
export type Callable<T extends Entity, R> = (entities: T[], result: R) => R

/**
 * Selection is a DSL building queries into an ECHO database.
 */
export class Selection<T extends Entity<any>, R = any> {
  /**
   * @param _visitor Execute the query.
   * @param _update The unfiltered update event.
   * @param _root The root of the selection. Must be a stable reference.
   */
  constructor (
    private readonly _visitor: (options: QueryOptions, result?: R) => SelectionContext<T, R>,
    private readonly _update: Event<Entity<any>[]>,
    private readonly _root: SelectionRoot
  ) {}

  /**
   * Creates a derrived selection by aplying a mapping function to the result of the current selection.
   */
  private _createSubSelection<U extends Entity<any>> (
    map: (entities: SelectionContext<T, R>, options: QueryOptions, result?: R) => SelectionContext<U, R>
  ): Selection<U> {
    return new Selection((options, result) => map(this._visitor(options, result), options), this._update, this._root);
  }

  /**
   * Finish the selection and return the result.
   */
  query (options: QueryOptions = {}): SelectionResult<T, R> {
    return new SelectionResult<T, R>(() => this._visitor(options), this._update, this._root);
  }

  /**
   * The root of the selection. Either a database or an item. Must be a stable reference.
   */
  get root (): SelectionRoot {
    return this._root;
  }

  /**
   * Call reducer.
   */
  reduce (result: R): Selection<T> {
    return this._createSubSelection(([items]) => [items, result]);
  }

  /**
   * Visitor.
   * @param visitor
   */
  call(visitor: Callable<T, R>): Selection<T> {
    return this._createSubSelection(([items, result]) => [items, visitor(items, result!)]);
  }

  /**
   * Filter entities of this selection.
   * @param filter A filter object or a predicate function.
   */
  filter(this: Selection<Item<any>>, filter: ItemFilter): Selection<Item<any>>
  filter<U extends Entity<any>>(this: Selection<U>, filter: Predicate<U>): Selection<U>
  filter<U extends Entity<any>> (this: Selection<U>, filter: Predicate<T> | ItemFilter): Selection<U> {
    const predicate = filterToPredicate(filter);
    return this._createSubSelection(([items, result]) => [items.filter(predicate), result]);
  }

  /**
   * Select children of the items in this selection.
   */
  children (this: Selection<Item<any>>): Selection<Item<any>> {
    return this._createSubSelection(([items, result], options) => [
      items.flatMap(item => Array.from(item._children.values()).filter(createQueryOptionsFilter(options))),
      result
    ]);
  }

  /**
   * Select parent of the items in this selection.
   */
  parent (this: Selection<Item<any>>): Selection<Item<any>> {
    return this._createSubSelection(([items, result], options) => [
      items.flatMap(item => item.parent ? [item.parent].filter(createQueryOptionsFilter(options)) : []),
      result
    ]);
  }

  /**
   * Select links sourcing from the items in this selection.
   */
  links (this: Selection<Item<any>>, filter: LinkFilter = {}): Selection<Link<any>> {
    const predicate = linkFilterToPredicate(filter);
    return this._createSubSelection(([items, result], options) => [
      items.flatMap(item => item.links.filter(predicate).filter(createQueryOptionsFilter(options))),
      result
    ]);
  }

  /**
   * Select links pointing to items in this selection.
   */
  refs (this: Selection<Item<any>>, filter: LinkFilter = {}): Selection<Link<any>> {
    const predicate = linkFilterToPredicate(filter);
    return this._createSubSelection(([items, result], options) => [
      items.flatMap(item => item.refs.filter(predicate).filter(createQueryOptionsFilter(options))),
      result
    ]);
  }

  /**
   * Select targets of links in this selection.
   */
  target (this: Selection<Link<any>>, filter: ItemFilter = {}): Selection<Item<any>> {
    const predicate = filterToPredicate(filter);
    return this._createSubSelection(([links, result], options) => [
      links.flatMap(link => link.target).filter(predicate).filter(createQueryOptionsFilter(options)),
      result
    ]);
  }

  /**
   * Select sources of links in this selection.
   */
  source (this: Selection<Link<any>>, filter: ItemFilter = {}): Selection<Item<any>> {
    const predicate = filterToPredicate(filter);
    return this._createSubSelection(([links, result], options) => [
      links.flatMap(link => link.source).filter(predicate).filter(createQueryOptionsFilter(options)),
      result
    ]);
  }
}

/**
 * Represents a live-query that can notify about future updates to the relevant subset of items.
 */
export class SelectionResult<T extends Entity<any>, R> { // TODO(burdon): Remove any from Entity
  /**
   * Fired when there are updates in the selection.
   * Only update that are relevant to the selection cause the update.
   */
  readonly update = new Event<T[]>();

  private _lastResult: SelectionContext<T, R>;

  constructor (
    private readonly _execute: () => SelectionContext<T, R>,
    private readonly _update: Event<Entity<any>[]>,
    private readonly _root: SelectionRoot
  ) {
    this._lastResult = this._execute();

    // Re-run if deps change.
    this.update.addEffect(() => _update.on(current => {
      const result = this._execute();
      const [entities] = result
      const set = new Set([...entities, ...this._lastResult]);
      this._lastResult = result;

      // TODO(burdon): Should also fire if entities have been removed from the set.
      if (current.some(entity => set.has(entity as any))) {
        this.update.emit(entities);
      }
    }));
  }

  /**
   * Get the result of this select.
   */
  // TODO(burdon): Rename entities.
  get result (): T[] {
    // TODO(burdon): Why re-run? Provider refresh method instead?
    const [entities] = this._execute();
    return dedupe(entities);
  }

  // TODO(burdon): Better name.
  get value (): R {
    const [, value] = this._execute();
    return value!;
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
