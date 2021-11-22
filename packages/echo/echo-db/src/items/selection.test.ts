//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import expect from 'expect';
import { it as test } from 'mocha';

import { Event } from '@dxos/async';
import { ItemID, ItemType } from '@dxos/echo-protocol';
import { ObjectModel } from '@dxos/object-model';

import { Item } from './item';
import { Link } from './link';
import { Selection } from './selection';
import { Entity } from './entity';

const OBJECT_ORG = 'dxn://dxos/object/org';
const OBJECT_PERSON = 'dxn://dxos/object/person';
const LINK_EMPLOYEE = 'dxn://dxos/link/employee';

const createItem = (id: ItemID, type: ItemType) =>
  new Item(id, type, ObjectModel.meta, new ObjectModel(ObjectModel.meta, id));

const createLink = (id: ItemID, type: ItemType, source: Item<any>, target: Item<any>) => {
  const link = new Link(id, type, ObjectModel.meta, new ObjectModel(ObjectModel.meta, id), {
    sourceId: source.id,
    targetId: target.id,
    source: source,
    target: target
  });

  source._links.add(link);
  target._refs.add(link);

  return link;
}

const items: Item<any>[] = [
  createItem('item/1', OBJECT_ORG),
  createItem('item/2', OBJECT_ORG),
  createItem('item/3', OBJECT_PERSON),
  createItem('item/4', OBJECT_PERSON),
  createItem('item/5', OBJECT_PERSON)
];

const links: Link<any>[] = [
  createLink('link/1', LINK_EMPLOYEE, items[0], items[2]),
  createLink('link/2', LINK_EMPLOYEE, items[0], items[3]),
  createLink('link/3', LINK_EMPLOYEE, items[0], items[4]),
  createLink('link/4', LINK_EMPLOYEE, items[1], items[4])
];

const entities: Entity<any>[] = [
  ...items,
  ...links
];

// TODO(burdon): Test subscriptions/reactivity.

describe('Selection', () => {
  test('simple', () => {
    expect(new Selection(() => entities, new Event()).items).toHaveLength(entities.length);
  });

  test('filter', () => {
    expect(new Selection(() => items, new Event())
      .filter({ type: 'dxn://dxos/type/invalid' }).items).toHaveLength(0);

    expect(new Selection(() => items, new Event())
      .filter({ type: OBJECT_PERSON }).items).toHaveLength(3);

    expect(new Selection(() => items, new Event())
      .filter({ type: [OBJECT_ORG, OBJECT_PERSON] }).items).toHaveLength(5);

    expect(new Selection(() => items, new Event())
      .filter(item => item.type === OBJECT_ORG).items).toHaveLength(2);
  });

  test('nested with duplicates', () => {
    let count = 0;

    const selection = new Selection(() => items, new Event())
      .filter({ type: OBJECT_ORG })
      .links({ type: LINK_EMPLOYEE })
      .call(selection => {
        count = selection.items.length;
      })
      .target();

    expect(count).toBe(4);
    expect(selection.items).toHaveLength(3);
  });

  test('links', () => {
    const count = {
      org: 0,
      links: 0
    };

    new Selection(() => items, new Event())
      .filter({ type: OBJECT_ORG })
      .each((org, selection) => {
        count.org++;
        selection
          .links({ type: LINK_EMPLOYEE })
          .each(link => {
            assert(link.sourceId === org.id);
            count.links++;
          });
      });

    expect(count.org).toBe(2);
    expect(count.links).toBe(4);
  });
});
