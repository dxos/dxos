//
// Copyright 2020 DXOS.org
//

import assert from 'assert';

import { Event } from '@dxos/async';
import { isNotNullOrUndefined } from '@dxos/util';

import { Entity } from './entity';
import { Item } from './item';
import { Link } from './link';

type SelectFilterFunction<T extends Entity<any>> = (item: T) => boolean;

export interface SelectFilterByValue {
  type: string | string[];
}

export type SelectFilter<T extends Entity<any>> = SelectFilterFunction<T> | SelectFilterByValue;

/**
 * @param filter
 */
const createArrayFilter = (filter: SelectFilterByValue): SelectFilterFunction<Entity<any>> => {
  if (typeof filter.type === 'string') {
    return (item: Entity<any>) => item.type === filter.type;
  }

  // Any type in array.
  assert(Array.isArray(filter.type));
  return (entitiy: Entity<any>) => entitiy.type !== undefined && filter.type.indexOf(entitiy.type) !== -1;
};

const filterToPredicate = <T extends Entity<any>> (filter: SelectFilter<T>): SelectFilterFunction<T> => typeof filter === 'function' ? filter : createArrayFilter(filter);

/**
 * Remove duplicate and undefined items.
 * @param items
 */
const deduplicate = <T> (items: T[]) => Array.from(new Set(items.filter(Boolean)).values());

/**
 * A chainable object which contains a set of items, and can be used to filter and traverse the object graph.
 *
 * Based loosely on [d3](https://github.com/d3/d3-selection).
 */
export class Selection<I extends Entity<any>> {
  /**
   * @param _items All items in the data set.
   * @param _update Update event handler.
   */
  constructor (
    private readonly _getItems: () => I[],
    private readonly _update: Event // TODO(burdon): Optional event?
  ) {}

  get items (): I[] {
    return this._getItems();
  }

  get update () {
    return this._update;
  }

  /**
   * Calls the given function with the current seleciton.
   * @param fn {Function} callback.
   */
  call (fn: (selection: this) => void) {
    fn(this);
    return this;
  }

  /**
   * Calls the given function for each item in the current selection.
   * @param fn {Function} Visitor callback.
   */
  each (fn: (item: I, selection: Selection<I>) => void) {
    this._getItems().forEach(item => fn(item, new Selection(() => [item], this._update)));
    return this;
  }

  /**
   * Creates a new selection by filtering the current selection.
   * @param filter
   */
  filter (filter: SelectFilter<I>): Selection<I> {
    const fn = filterToPredicate(filter);
    return new Selection(() => this._getItems().filter(fn), this._update);
  }

  //
  // Item-specific
  //

  /**
   * Creates a new selection with the parent nodes of the selection.
   */
  parent (this: Selection<Item<any>>) {
    return new Selection(() => this._getItems().map(item => item.parent).filter(isNotNullOrUndefined), this._update);
  }

  /**
   * Creates a new selection with the child nodes of the selection.
   */
  children (this: Selection<Item<any>>) {
    return new Selection(() => this._getItems().flatMap(item => item.children), this._update);
  }

  /**
   * Creates a new selection by filtering links from the current selection.
   * @param filter
   */
  // TODO(burdon): Optional filter.
  links (this: Selection<Item<any>>, filter: SelectFilter<Link<any>>): Selection<any> {
    const fn = filterToPredicate(filter);
    return new Selection(() => deduplicate(this._getItems().flatMap(item => item.links.filter(fn))), this._update);
  }

  /**
   * Creates a new selection by filtering inbound links to items in the current selection.
   * @param filter
   */
  // TODO(burdon): Optional filter.
  refs (this: Selection<Item<any>>, filter: SelectFilter<Link<any>>): Selection<any> {
    const fn = filterToPredicate(filter);
    return new Selection(() => deduplicate(this._getItems().flatMap(item => item.refs.filter(fn))), this._update);
  }

  //
  // Link-specific
  //

  /**
   * Creates a new selection from the source of the current set of links.
   */
  source (this: Selection<Link<any>>) {
    // TODO(burdon): Assert links (or sub-class Object/LinkSelection classes?).
    return new Selection(() => deduplicate(this._getItems().map(link => link.source)), this._update);
  }

  /**
   * Creates a new selection from the target of the current set of links.
   */
  target (this: Selection<Link<any>>) {
    // TODO(burdon): Assert links (or sub-class Object/LinkSelection classes?).
    return new Selection(() => deduplicate(this._getItems().map(link => link.target)), this._update);
  }
}

/**
 * Live query returned after performing the selection.
 */
export class SelectionResult<T> {
  readonly update = new Event<T>();

  constructor (
    private readonly _selection: Selection<any>,
    private readonly _selector: (selection: Selection<any>) => T
  ) {
    this.update.addEffect(() =>
      this._selection.update.on(() =>
        this.update.emit(this.getValue())));
  }

  getValue (): T {
    return this._selector(this._selection);
  }

  /**
   * Asserts that the result only has one element and returns it.
   */
  expectOne<U> (this: SelectionResult<U[]>): U {
    const value = this.getValue();
    if (value.length === 1) {
      return value[0];
    } else {
      throw new Error(`Expected the SelectionResult to have a single element but it returned ${value.length}`);
    }
  }
}
