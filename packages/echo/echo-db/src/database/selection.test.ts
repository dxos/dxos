//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import expect from 'expect';
import { it as test } from 'mocha';

import { Event } from '@dxos/async';
import { ItemID, ItemType } from '@dxos/echo-protocol';
import { ObjectModel } from '@dxos/object-model';

import { Entity } from './entity';
import { Item } from './item';
import { Link } from './link';
import { Selection } from './selection';

const OBJECT_ORG = 'dxos:object/org';
const OBJECT_PERSON = 'dxos:object/person';
const LINK_EMPLOYEE = 'dxos:link/employee';

const createItem = (id: ItemID, type: ItemType) =>
  new Item(id, type, new ObjectModel(ObjectModel.meta, id));

const createLink = (id: ItemID, type: ItemType, source: Item<any>, target: Item<any>) => {
  const link = new Link(id, type, new ObjectModel(ObjectModel.meta, id), {
    sourceId: source.id,
    targetId: target.id,
    source: source,
    target: target
  });

  source._links.add(link);
  target._refs.add(link);

  return link;
};

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

const createSelection = () => {
  const update = new Event<Entity<any>[]>();

  const selection = new Selection(
    () => items,
    entities => entities.filter(entity => entity instanceof Item), // We are only intereseted in updates to items.
    update,
    null as any,
  );

  return { selection, update }
}

// TODO(burdon): Test subscriptions/reactivity.

describe.only('Selection', () => {
  test('simple', () => {
    expect(
      createSelection().selection
      .query().result
    ).toHaveLength(items.length);
  });

  test('filter', () => {
    expect(
      createSelection().selection
      .filter({ type: 'dxos:type/invalid' })
      .query().result
    ).toHaveLength(0);

    expect(
      createSelection().selection
      .filter({ type: OBJECT_PERSON })
      .query().result
    ).toHaveLength(3);

    expect(
      createSelection().selection
      .filter({ type: [OBJECT_ORG, OBJECT_PERSON] })
      .query().result
    ).toHaveLength(5);

    expect(
      createSelection().selection
      .filter(item => item.type === OBJECT_ORG)
      .query().result
    ).toHaveLength(2);
  });

  // test('nested with duplicates', () => {
  //   let count = 0;

  //   const selection = new Selection(() => items, new Event())
  //     .filter({ type: OBJECT_ORG })
  //     .links({ type: LINK_EMPLOYEE })
  //     .call(selection => {
  //       count = selection.items.length;
  //     })
  //     .target();

  //   expect(count).toBe(4);
  //   expect(selection.items).toHaveLength(3);
  // });

  // test('links', () => {
  //   const count = {
  //     org: 0,
  //     links: 0
  //   };

  //   new Selection(() => items, new Event())
  //     .filter({ type: OBJECT_ORG })
  //     .each((org, selection) => {
  //       count.org++;
  //       selection
  //         .links({ type: LINK_EMPLOYEE })
  //         .each(link => {
  //           assert(link.sourceId === org.id);
  //           count.links++;
  //         });
  //     });

  //   expect(count.org).toBe(2);
  //   expect(count.links).toBe(4);
  // });
});
