//
// Copyright 2020 DXOS.org
//

import assert from 'assert';

import { Event } from '@dxos/async';
import { isNotNullOrUndefined } from '@dxos/util';

import { Entity } from './entity';
import { Item } from './item';
import { Link } from './link';
import { ItemID } from '@dxos/echo-protocol';
import { Database } from '.';

export type OneOrMultiple<T> = T | T[];

export interface ItemFilter {
  type?: OneOrMultiple<string>;
  parent?: ItemID | Item<any>
}

export type ArrayFilter<T> = (element: T) => boolean;

export interface ItemIdFilter {
  id: ItemID
}

export type RootFilter = ItemIdFilter | ItemFilter | ArrayFilter<Item<any>>;

export interface RootSelector {
  (filter: ItemIdFilter): Selection<Item<any> | undefined>;
  (filter?: ItemFilter | ArrayFilter<Item<any>>): Selection<Item<any>[]>;
}

export function createRootSelector(getItems: () => Item<any>[], update: Event<Entity<any>[]>, root: SelectionRoot): RootSelector {
  return (filter?: RootFilter): Selection<any> => {
    if (filter && 'id' in filter) {
      return new Selection(() => getItems().find(item => item.id === filter.id), update, root);
    } else {
      const predicate = filter ? filterToPredicate(filter) : () => true;
      return new Selection(() => getItems().filter(predicate), update, root);
    }
  }
}

export type SelectionRoot = Database | Entity<any>;

export class Selection<T> {

  /**
   * 
   * @param _run Execute the query.
   * @param _updateFilter Predicate to determine if the update event should be fired based on the set of changed items.
   * @param _update The unfiltered update event.
   * @param _root The root of the selection. Must be a stable reference.
   */
  constructor(
    private readonly _run: () => T,
    private readonly _update: Event<Entity<any>[]>,
    private readonly _root: SelectionRoot,
  ) {}

  query(): SelectionResult<T> {
    return new SelectionResult<T>(this._run, this._update, this._root);
  }

  private _derive<U>(map: (arg: T) => U): Selection<U> {
    return new Selection(() => map(this._run()), this._update, this._root);
  }

  filter(this: Selection<Item<any>[]>, filter: ItemFilter): Selection<Item<any>[]>
  filter<U>(this: Selection<U[]>, filter: ArrayFilter<U>): Selection<U[]>
  filter<U>(this: Selection<U[]>, filter: ArrayFilter<T> | ItemFilter): Selection<U[]> {
    const predicate = filterToPredicate(filter)
    return this._derive(items => items.filter(predicate));
  }

  children(this: Selection<Item<any> | undefined>): Selection<Item<any>[]>
  children(this: Selection<Item<any>[]>): Selection<Item<any>[]>
  children(this: Selection<Item<any> | undefined | Item<any>[]>): Selection<Item<any>[]> {
    return this._derive(item => Array.isArray(item) ? item.flatMap(item => item.children) : item?.children ?? []);
  }
}

export class SelectionResult<T> {
  /**
   * Fired when there are updates in the selection. Only update that are relevant to the selection cause the update.
   */
  readonly update = new Event<T>();

  constructor (
    private readonly _run: () => T,
    private readonly _update: Event<Entity<any>[]>,
    private readonly _root: SelectionRoot,
  ) {
    this.update.addEffect(() => _update.on(entities => {
      const result = this._run();
      const set = Array.isArray(result) ? new Set(result) : new Set([result]);
      return entities.some(entity => set.has(entity));
    }))
  }

  /**
   * Result of the selection.
   */
  get result(): T {
    return this._run();
  }

  /**
   * The root of the selection. Must be a stable reference.
   */
  get root(): SelectionRoot {
    return this._root;
  }
}

function coerseToId(item: Item<any> | ItemID): ItemID {
  if (typeof item === 'string') {
    return item;
  }

  return item.id;
}

function testOneOrMultiple<T>(expected: OneOrMultiple<T>, value: T) {
  if(Array.isArray(expected)) {
    return expected.includes(value);
  } else {
    return expected === value;
  }
}

function filterToPredicate<T>(filter: ArrayFilter<T> | ItemFilter): ArrayFilter<any> {
  if (typeof filter === 'function') {
    return filter;
  }

  return itemFilterToPredicate(filter);
}

function itemFilterToPredicate(filter: ItemFilter): (item: Item<any>) => boolean {
  return item => (!filter.type || testOneOrMultiple(filter.type, item.type)) &&
    (!filter.parent || item.parent?.id === coerseToId(filter.parent));
}

// type Party = any;

// const test = async (party: Party) => {
//   const reusableSelection = party.select({ id: '000' }).children();

//   const { items: result } = reusableSelection.query();
//   const { links: result } = reusableSelection.links({ type: 'WORKS_FOR' }).query();

//   // one off
//   const { result: items } = party.select().query();

//   // subscription
//   const selection = party.select().query();
//   selection.update.on(result => {
    
//   });

//   const selection = party.select();
//   const { result: items } = selection;
//   {
//     const items = selection.result; // Query again?
//   }
// };

// void test(undefined);


// // React

// const useSeletion = <T extends any>(selection: Selection<T> | () => Selection<T>, deps: unknown[] = []): T => {
  
// };

// const Test = ({ party }: { party: Party }) => {
//   const { result: items } = useSelection<Item<any>>(party.select({ type: KANBAN }));
//   return (
//     <div>
//       {items.map(item => (
//         <div key={item.id}>{item.model.getProperty('title')}</div>
//       ))}
//     </div>
//   );
// }
