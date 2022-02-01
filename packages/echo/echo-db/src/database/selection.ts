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

export interface ItemFilter {
  type?: string
  parent?: ItemID | Item<any>
}

function coerseToId(item: Item<any> | ItemID): ItemID {
  if (typeof item === 'string') {
    return item;
  }

  return item.id;
}

function filterToPredicate(filter: ItemFilter): (item: Item<any>) => boolean {
  return item => (!filter.type || item.type === filter.type) &&
    (!filter.parent || item.parent?.id === coerseToId(filter.parent));
}

// Selection<Item | undefined>
// Selection<Item[]>
// Selection<Links | undefined>
// Selection<Links[]>
// Selection<Entity | undefined>
// Selection<Entity[]>

// interface Database implements Selector<T> {
//   select: (filter?: ItemFilter) => Selection<Item<any>[]>
// }

// interface Party {
//   select: (filter?: ItemFilter) => Selection<Item<any>[]>
// }

// interface Entity {
//   select(): Selection<this>
// }

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
    private readonly _updateFilter: (entities: Entity<any>[]) => Entity<any>[],
    private readonly _update: Event<Entity<any>[]>,
    private readonly _root: Database | Entity<any>,
  ) {}

  query(): SelectionResult<T> {
    return new SelectionResult<T>(this._run, this._updateFilter, this._update, this._root);
  }

  private _derive<U>(
    map: (arg: T) => U,
    updateFilter: (entities: Entity<any>[]) => Entity<any>[]
  ): Selection<U> {
    return new Selection(() => map(this._run()), updateFilter, this._update, this._root);
  }

  filter(this: Selection<Item<any>[]>, filter: ItemFilter): Selection<Item<any>[]> {
    const predicate = filterToPredicate(filter)
    return this._derive(
      items => items.filter(predicate),
      entities => this._updateFilter(entities).filter(entity => entity instanceof Item && predicate(entity))
    );
  }

  children(this: Selection<Item<any>>): Selection<Item<any>[]>
  children(this: Selection<Item<any>[]>): Selection<Item<any>[]>
  children(this: Selection<Item<any> | Item<any>[]>): Selection<Item<any>[]> {
    return this._derive(
      item => Array.isArray(item) ? item.flatMap(item => item.children) : item.children,
      entities => {
        const prev = this._updateFilter(entities);
        return entities.filter(entity => entity instanceof Item && (prev.includes(entity) || entity.parent && prev.includes(entity.parent)));
      }
    );
  }

  
}

export class SelectionResult<T> {
  /**
   * Fired when there are updates in the selection. Only update that are relevant to the selection cause the update.
   */
  readonly update = new Event<T>();

  constructor (
    private readonly _run: () => T,
    private readonly _updateFilter: (entities: Entity<any>[]) => Entity<any>[],
    private readonly _update: Event<Entity<any>[]>,
    private readonly _root: Database | Entity<any>,
  ) {
    this.update.addEffect(() => _update.on(entities => {
      if(this._updateFilter(entities).length > 0) {
        this.update.emit(this._run());
      }
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
  get root(): Database | Entity<any> {
    return this._root;
  }
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
