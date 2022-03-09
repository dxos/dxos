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

export type OneOrMultiple<T> = T | T[]

//
// Filters
//

export type ItemIdFilter = {
  id: ItemID
}

export type ItemFilter = {
  type?: OneOrMultiple<string>
  parent?: ItemID | Item
}

export type LinkFilter = {
  type?: OneOrMultiple<string>;
}

export type Predicate<T extends Entity> = (entity: T) => boolean;

export type RootFilter = ItemIdFilter | ItemFilter | Predicate<Item>

export type RootSelector<R = void> = (filter?: RootFilter) => Selection<Item<any>, R>

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
 * Represents where the selection has started.
 */
export type SelectionRoot = Database | Entity;

/**
 * Returned from each stage of the visitor.
 */
export type SelectionContext<T extends Entity, R> = [entities: T[], result?: R]

/**
 * Visitor callback.
 * The visitor is passed the current entities and result (accumulator),
 * which may be modified and returned.
 */
export type Callable<T extends Entity, R> = (entities: T[], result: R) => R

/**
 * Factory for selector that provides a root set of items.
 * @param itemsProvider
 * @param updateEventProvider
 * @param root
 * @param filter
 * @param value Initial reducer value.
 */
export const createSelector = <R>(
  // Provider is called each time the query is executed.
  itemsProvider: () => Item[],
  // TODO(burdon): Replace with direct event handler.
  updateEventProvider: () => Event<Entity[]>,
  root: SelectionRoot,
  filter: RootFilter | undefined,
  value: R
): Selection<Item<any>, R> => {
  const predicate = filter ? filterToPredicate(filter) : () => true;
  const visitor = (options: QueryOptions): SelectionContext<any, any> => {
    const items = itemsProvider()
      .filter(createQueryOptionsFilter(options))
      .filter(predicate);

    return [items, value];
  };

  return new Selection(visitor, updateEventProvider(), root, value !== undefined);
};

/**
 * Factory for specific item selector.
 * @param root
 * @param update
 * @param value Initial reducer value.
 */
export const createItemSelector = <R>(
  root: Item<any>,
  update: Event<Entity[]>,
  value: R
): Selection<Item<any>, R> => new Selection(() => [[root], value], update, root, value !== undefined);

/**
 * Selections are used to construct database subscriptions.
 * They are [monads](https://www.quora.com/What-are-monads-in-computer-science) that support
 * the functional composition of predicates to traverse the graph.
 * Additionally, selections may be used to create reducers that compute an aggregated value over the traversal.
 *
 * Implementation:
 * Each Selection contains a visitor
 */
export class Selection<T extends Entity<any>, R = void> {
  /**
   * @param _visitor Executes the query.
   * @param _update The unfiltered update event.
   * @param _root The root of the selection. Must be a stable reference.
   * @param _reducer
   */
  constructor (
    private readonly _visitor: (options: QueryOptions) => SelectionContext<T, R>,
    private readonly _update: Event<Entity[]>,
    private readonly _root: SelectionRoot,
    private readonly _reducer = false
  ) {}

  /**
   * Creates a derrived selection by aplying a mapping function to the result of the current selection.
   */
  private _createSubSelection<U extends Entity> (
    map: (context: SelectionContext<T, R>, options: QueryOptions) => SelectionContext<U, R>
  ): Selection<U, R> {
    return new Selection(options => map(this._visitor(options), options), this._update, this._root, this._reducer);
  }

  /**
   * Finish the selection and return the result.
   */
  // TODO(burdon): Rename exec.
  query (options: QueryOptions = {}): SelectionResult<T, R> {
    return new SelectionResult<T, R>(() => this._visitor(options), this._update, this._root, this._reducer);
  }

  /**
   * The root of the selection. Either a database or an item. Must be a stable reference.
   */
  get root (): SelectionRoot {
    return this._root;
  }

  /**
   * Visitor.
   * @param visitor
   */
  call (visitor: Callable<T, R>): Selection<T, R> {
    return this._createSubSelection(([items, result]) => [items, visitor(items, result!)]);
  }

  /**
   * Filter entities of this selection.
   * @param filter A filter object or a predicate function.
   */
  filter(this: Selection<Item<any>, R>, filter: ItemFilter): Selection<Item<any>, R>
  filter<U extends Entity>(this: Selection<U, R>, filter: Predicate<U>): Selection<U, R>
  filter<U extends Entity> (this: Selection<U, R>, filter: Predicate<T> | ItemFilter): Selection<U, R> {
    const predicate = filterToPredicate(filter);
    return this._createSubSelection(([items, result]) => [items.filter(predicate), result]);
  }

  /**
   * Select children of the items in this selection.
   */
  children (this: Selection<Item<any>, R>, filter?: ItemFilter): Selection<Item<any>, R> {
    const predicate = filter ? filterToPredicate(filter) : Boolean;
    return this._createSubSelection(([items, result], options) => [
      items.flatMap(item => Array.from(item._children.values())
        .filter(createQueryOptionsFilter(options))
        .filter(predicate)
      ),
      result
    ]);
  }

  /**
   * Select parent of the items in this selection.
   */
  parent (this: Selection<Item<any>, R>): Selection<Item<any>, R> {
    return this._createSubSelection(([items, result], options) => [
      items.flatMap(item => item.parent ? [item.parent].filter(createQueryOptionsFilter(options)) : []),
      result
    ]);
  }

  /**
   * Select links sourcing from the items in this selection.
   */
  links (this: Selection<Item<any>, R>, filter: LinkFilter = {}): Selection<Link, R> {
    const predicate = linkFilterToPredicate(filter);
    return this._createSubSelection(([items, result], options) => [
      items.flatMap(item => item.links.filter(predicate).filter(createQueryOptionsFilter(options))),
      result
    ]);
  }

  /**
   * Select links pointing to items in this selection.
   */
  refs (this: Selection<Item<any>, R>, filter: LinkFilter = {}): Selection<Link, R> {
    const predicate = linkFilterToPredicate(filter);
    return this._createSubSelection(([items, result], options) => [
      items.flatMap(item => item.refs.filter(predicate).filter(createQueryOptionsFilter(options))),
      result
    ]);
  }

  /**
   * Select targets of links in this selection.
   */
  target (this: Selection<Link, R>, filter: ItemFilter = {}): Selection<Item<any>, R> {
    const predicate = filterToPredicate(filter);
    return this._createSubSelection(([links, result], options) => [
      links.flatMap(link => link.target).filter(predicate).filter(createQueryOptionsFilter(options)),
      result
    ]);
  }

  /**
   * Select sources of links in this selection.
   */
  source (this: Selection<Link, R>, filter: ItemFilter = {}): Selection<Item<any>, R> {
    const predicate = filterToPredicate(filter);
    return this._createSubSelection(([links, result], options) => [
      links.flatMap(link => link.source).filter(predicate).filter(createQueryOptionsFilter(options)),
      result
    ]);
  }
}

/**
 * Query subscription.
 * Represents a live-query (subscription) that can notify about future updates to the relevant subset of items.
 */
export class SelectionResult<T extends Entity, R = any> {
  /**
   * Fired when there are updates in the selection.
   * Only update that are relevant to the selection cause the update.
   */
  readonly update = new Event<SelectionResult<T>>(); // TODO(burdon): Result result object.

  private _lastResult: SelectionContext<T, R> = [[]];

  constructor (
    private readonly _execute: () => SelectionContext<T, R>,
    private readonly _update: Event<Entity[]>,
    private readonly _root: SelectionRoot,
    private readonly _reducer: boolean
  ) {
    this.refresh();

    // Re-run if deps change.
    this.update.addEffect(() => _update.on(currentEntities => {
      const [previousEntities] = this._lastResult;

      this.refresh();

      // Filters mutation events only if selection (since we can't reason about deps of call methods).
      const set = new Set([...previousEntities, ...this._lastResult![0]]);
      if (this._reducer || currentEntities.some(entity => set.has(entity as any))) {
        this.update.emit(this);
      }
    }));
  }

  /**
   * Re-run query.
   */
  refresh () {
    const [entities, result] = this._execute();
    this._lastResult = [dedupe(entities), result];
    return this;
  }

  /**
   * The root of the selection. Either a database or an item. Must be a stable reference.
   */
  get root (): SelectionRoot {
    return this._root;
  }

  /**
   * @deprecated
   */
  // TODO(burdon): Remove.
  // get result () {
  //   return this.entities;
  // }

  /**
   * Get the result of this selection.
   */
  get entities (): T[] {
    if (!this._lastResult) {
      this.refresh();
    }

    const [entities] = this._lastResult!;
    return entities;
  }

  /**
   * Returns the selection or reducer result.
   */
  get value (): R extends void ? T[] : R {
    if (!this._lastResult) {
      this.refresh();
    }

    const [entities, value] = this._lastResult!;
    return (this._reducer ? value : entities) as any;
  }

  /**
   * Return the first element if the set has exactly one element.
   */
  expectOne (): T {
    const entities = this.entities;
    assert(entities.length === 1, `Expected one result; got ${entities.length}`);
    return entities[0];
  }
}

//
// Utils
//

const dedupe = <T>(values: T[]) => Array.from(new Set(values));

const coerceToId = (item: Item | ItemID): ItemID => {
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

const itemFilterToPredicate = (filter: ItemFilter | ItemIdFilter): Predicate<Item> => {
  if ('id' in filter) {
    return item => item.id === filter.id;
  } else {
    return item =>
      (!filter.type || testOneOrMultiple(filter.type, item.type)) &&
      (!filter.parent || item.parent?.id === coerceToId(filter.parent));
  }
};

const linkFilterToPredicate = (filter: LinkFilter): Predicate<Link> =>
  link => (!filter.type || testOneOrMultiple(filter.type, link.type));

const createQueryOptionsFilter = ({ deleted = ItemFilterDeleted.HIDE_DELETED }: QueryOptions): Predicate<Entity> => {
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
