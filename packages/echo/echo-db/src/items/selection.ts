//
// Copyright 2020 DXOS.org
//

import assert from 'assert';

import { Event } from '@dxos/async';

import { Item } from './item';
import { Link } from './link';

type SelectFilterFunction = (item: Item<any>) => Boolean;

export interface SelectFilterByValue {
  type: string | string[];
}

export type SelectFilter = SelectFilterFunction | SelectFilterByValue;

/**
 * @param filter
 */
const createArrayFilter = (filter: SelectFilterByValue) => {
  if (typeof filter.type === 'string') {
    return (item: Item<any>) => item.type === filter.type;
  }

  // Any type in array.
  assert(Array.isArray(filter.type));
  return (item: Item<any>) => item.type && filter.type.indexOf(item.type) !== -1;
};

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
export class Selection<I extends Item<any>> {
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
   * Creates a new selection with the parent nodes of the selection.
   */
  parent () {
    return new Selection(() => this._getItems().map(item => item.parent).filter(Boolean) as Item<any>[], this._update);
  }

  /**
   * Creates a new selection with the child nodes of the selection.
   */
  children () {
    return new Selection(() => this._getItems().flatMap(item => item.children), this._update);
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
    this._getItems().forEach(item => fn(item as any, new Selection(() => [item], this._update)));
    return this;
  }

  /**
   * Creates a new selection by filtering the current selection.
   * @param filter
   */
  filter (filter: SelectFilter): Selection<I> {
    const fn = typeof filter === 'function' ? filter : createArrayFilter(filter as SelectFilterByValue);
    return new Selection(() => this._getItems().filter(fn), this._update);
  }

  /**
   * Creates a new selection by filtering links from the current selection.
   * @param filter
   */
  // TODO(burdon): Optional filter.
  links (filter: SelectFilter): Selection<any> {
    const fn = typeof filter === 'function' ? filter : createArrayFilter(filter as SelectFilterByValue);
    return new Selection(() => deduplicate(this._getItems().flatMap(item => item.links.filter(fn))), this._update);
  }

  /**
   * Creates a new selection by filtering inbound links to items in the current selection.
   * @param filter
   */
  // TODO(burdon): Optional filter.
  refs (filter: SelectFilter): Selection<any> {
    const fn = typeof filter === 'function' ? filter : createArrayFilter(filter as SelectFilterByValue);
    return new Selection(() => deduplicate(this._getItems().flatMap(item => item.refs.filter(fn))), this._update);
  }

  /**
   * Creates a new selection from the source of the current set of links.
   */
  source (this: Selection<Link<any, any, any>>) {
    // TODO(burdon): Assert links (or sub-class Object/LinkSelection classes?)
    return new Selection(() => deduplicate(this._getItems().map(link => link.source)), this._update);
  }

  /**
   * Creates a new selection from the target of the current set of links.
   */
  target (this: Selection<Link<any, any, any>>) {
    // TODO(burdon): Assert links (or sub-class Object/LinkSelection classes?)
    return new Selection(() => deduplicate(this._getItems().map(link => link.target)), this._update);
  }
}

/**
 * Live query returned after performing the selection.
 */
export class SelectionResult<T> {
  constructor (
    private readonly _selection: Selection<any>,
    private readonly _selector: (selection: Selection<any>) => T
  ) {}

  readonly update = this._selection.update;

  getValue (): T {
    return this._selector(this._selection);
  }
}
