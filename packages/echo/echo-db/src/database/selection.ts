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

interface ItemFilter {
  type?: string
  parent: ItemID | Item<any>
}

// Selection<Item | undefined>
// Selection<Item[]>
// Selection<Links | undefined>
// Selection<Links[]>
// Selection<Entity | undefined>
// Selection<Entity[]>

interface Selector<A extends any[], R> {
  select: (...args: A) => Selection<R>
}
interface ItemSelector<R> {
  select: () => Selection<R>
}



interface Database implements Selector<T> {
  select: (filter?: ItemFilter) => Selection<Item<any>[]>
}

interface Party {
  select: (filter?: ItemFilter) => Selection<Item<any>[]>
}

interface Entity {
  select(): Selection<this>
}

class Selection<T> {

  // Sync.
  query(): SelectionResult<T> {
    return new SelectionResult<T>(this);
  }

  filter(this: Selection<Item<any>[]>, filter: ItemFilter): Selection<Item<any>[]> {
    return null as any;
  }

  children(this: Selection<Item<any>>): Selection<Item<any>[]>
  children(this: Selection<Item<any>[]>): Selection<Item<any>[]>
  children(): Selection<Item<any>[]> {
    return null as any;
  }
}

class SelectionResult<T> {
  root: Party | Entity;

  constructor (
    _selection: Selection<any>
  ) {}

  get result(): T {
    return null as any;
  }

  update: Event<T> = new Event<T>();
}

type Party = any;

const test = async (party: Party) => {
  const reusableSelection = party.select({ id: '000' }).children();

  const { items: result } = reusableSelection.query();
  const { links: result } = reusableSelection.links({ type: 'WORKS_FOR' }).query();

  // one off
  const { result: items } = party.select().query();

  // subscription
  const selection = party.select().query();
  selection.update.on(result => {
    
  });

  const selection = party.select();
  const { result: items } = selection;
  {
    const items = selection.result; // Query again?
  }
};

void test(undefined);


// React

const useSeletion = <T extends any>(selection: Selection<T> | () => Selection<T>, deps: unknown[] = []): T => {
  
};

const Test = ({ party }: { party: Party }) => {
  const { result: items } = useSelection<Item<any>>(party.select({ type: KANBAN }));
  return (
    <div>
      {items.map(item => (
        <div key={item.id}>{item.model.getProperty('title')}</div>
      ))}
    </div>
  );
}
