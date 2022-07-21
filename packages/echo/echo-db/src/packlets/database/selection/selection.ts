//
// Copyright 2020 DXOS.org
//

import { Event } from '@dxos/async';

import { Entity } from '../entity';
import { Item } from '../item';
import { Link } from '../link';
import {
  createQueryOptionsFilter,
  filterToPredicate,
  linkFilterToPredicate,
  Callable,
  ItemFilter,
  LinkFilter,
  Predicate,
  QueryOptions,
  RootFilter
} from './queries';
import { SelectionContext, SelectionResult, SelectionRoot } from './result';

/**
 * Factory for selector that provides a root set of items.
 * @param itemsProvider
 * @param updateEventProvider
 * @param root
 * @param filter
 * @param value Initial reducer value.
 */
export const createSelection = <R>(
  // Provider is called each time the query is executed.
  itemsProvider: () => Item[],
  // TODO(burdon): Replace with direct event handler.
  updateEventProvider: () => Event<Entity[]>,
  root: SelectionRoot,
  filter: RootFilter | undefined,
  value: R
): Selection<Item<any>, R> => {
  const predicate = filter ? filterToPredicate(filter) : () => true;

  // TODO(burdon): Option to filter out system types.
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
export const createItemSelection = <R>(root: Item<any>, update: Event<Entity[]>, value: R): Selection<Item<any>, R> => new Selection(() => [[root], value], update, root, value !== undefined);

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
  exec (options: QueryOptions = {}): SelectionResult<T, R> {
    return this.query(options);
  }

  /**
   * @deprecated
   */
  // TODO(burdon): Remove.
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
