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
import { createRootSelector } from '.';

const OBJECT_ORG = 'dxos:object/org';
const OBJECT_PERSON = 'dxos:object/person';
const LINK_EMPLOYEE = 'dxos:link/employee';

const createItem = (id: ItemID, type: ItemType, parent?: Item<any>) => 
  new Item(id, type, new ObjectModel(ObjectModel.meta, id), undefined, parent);

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

const org1 = createItem('item/1', OBJECT_ORG);
const org2 = createItem('item/2', OBJECT_ORG);
const items: Item<any>[] = [
  org1,
  org2,
  createItem('item/3', OBJECT_PERSON, org1),
  createItem('item/4', OBJECT_PERSON, org1),
  createItem('item/5', OBJECT_PERSON, org2)
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

const rootSelector = createRootSelector(() => items, new Event(), null as any);

// TODO(burdon): Test subscriptions/reactivity.

describe.only('Selection', () => {
  describe('root', () => {
    test('all', () => {
      expect(
        rootSelector()
        .query().result
      ).toHaveLength(items.length);
    });

    test('by id', () => {
      expect(
        rootSelector({ id: org1.id })
        .query().result
      ).toEqual(org1);

      expect(
        rootSelector({ id: org2.id })
        .query().result
      ).toEqual(org2);
    });

    test('single type', () => {
      expect(
        rootSelector({ type: OBJECT_PERSON })
        .query().result
      ).toHaveLength(3);
    });

    test('multiple types', () => {
      expect(
        rootSelector({ type: [OBJECT_ORG, OBJECT_PERSON] })
        .query().result
      ).toHaveLength(5);
    });
  })

  describe('filter', () => {
    test('invalid', () => {
      expect(
        rootSelector()
        .filter({ type: 'dxos:type/invalid' })
        .query().result
      ).toHaveLength(0);
    });

    test('single type', () => {
      expect(
        rootSelector()
        .filter({ type: OBJECT_PERSON })
        .query().result
      ).toHaveLength(3);
    });

    test('multiple types', () => {
      expect(
        rootSelector()
        .filter({ type: [OBJECT_ORG, OBJECT_PERSON] })
        .query().result
      ).toHaveLength(5);
    });

    test('by function', () => {
      expect(
        rootSelector()
        .filter(item => item.type === OBJECT_ORG)
        .query().result
      ).toHaveLength(2);
    })
  });

  describe('children', () => {
    test('from multiple items', () => {
      expect(
        rootSelector()
        .filter({ type: OBJECT_ORG })
        .children()
        .query().result
      ).toEqual([
        items[2],
        items[3],
        items[4],
      ]);
    });

    test('from single item', () => {
      expect(
        rootSelector({ id: org1.id })
        .children()
        .query().result
      ).toEqual([
        items[2],
        items[3],
      ]);
    });
  })

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
