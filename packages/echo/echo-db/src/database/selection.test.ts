//
// Copyright 2020 DXOS.org
//

import expect from 'expect';
import { it as test } from 'mocha';

import { Event, promiseTimeout } from '@dxos/async';
import { PublicKey } from '@dxos/crypto';
import { ItemID, ItemType } from '@dxos/echo-protocol';
import { ModelFactory } from '@dxos/model-factory';
import { ObjectModel } from '@dxos/object-model';

import { Entity } from '.';
import { Item } from './item';
import { Link } from './link';
import { createRootSelector } from './selection';

// TODO(burdon): Dots or slashes!?
const OBJECT_ORG = 'dxos:object/org';
const OBJECT_PERSON = 'dxos:object/person';
const LINK_EMPLOYEE = 'dxos:link/employee';

const modelFactory = new ModelFactory().registerModel(ObjectModel);

const createModel = (id: ItemID) => modelFactory.createModel(ObjectModel.meta.type, id, {}, PublicKey.random());

const createItem = (id: ItemID, type: ItemType, parent?: Item<any>) =>
  new Item(null as any, id, type, createModel(id), undefined, parent);

const createLink = (id: ItemID, type: ItemType, source: Item<any>, target: Item<any>) => {
  const link = new Link(null as any, id, type, createModel(id), {
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

const person1 = createItem('item/3', OBJECT_PERSON, org1);
const person2 = createItem('item/4', OBJECT_PERSON, org1);
const person3 = createItem('item/5', OBJECT_PERSON, org2);

const items: Item<any>[] = [
  org1,
  org2,
  person1,
  person2,
  person3
];

const links: Link<any>[] = [
  createLink('link/1', LINK_EMPLOYEE, org1, person1),
  createLink('link/2', LINK_EMPLOYEE, org1, person2),
  createLink('link/3', LINK_EMPLOYEE, org1, person3),
  createLink('link/4', LINK_EMPLOYEE, org2, person3)
];

const rootSelector = createRootSelector(() => items, () => new Event(), null as any);

// TODO(burdon): Test subscriptions/reactivity.

describe('Selection', () => {
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
      ).toEqual([org1]);

      expect(
        rootSelector({ id: org2.id })
          .query().result
      ).toEqual([org2]);
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
  });

  describe('filter', () => {
    test('invalid', () => {
      expect(
        rootSelector()
          .filter({ type: 'dxos:type.invalid' })
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
    });
  });

  describe('children', () => {
    test('from multiple items', () => {
      expect(
        rootSelector()
          .filter({ type: OBJECT_ORG })
          .children()
          .query().result
      ).toEqual([
        person1,
        person2,
        person3
      ]);
    });

    test('from single item', () => {
      expect(
        rootSelector({ id: org1.id })
          .children()
          .query().result
      ).toEqual([
        person1,
        person2
      ]);
    });
  });

  describe('parent', () => {
    test('from multiple items', () => {
      expect(
        rootSelector()
          .filter({ type: OBJECT_PERSON })
          .parent()
          .query().result
      ).toEqual([
        org1,
        org2
      ]);
    });

    test('from single item', () => {
      expect(
        rootSelector({ id: person1.id })
          .parent()
          .query().result
      ).toEqual([
        org1
      ]);
    });

    test('is empty', () => {
      expect(
        rootSelector({ id: org1.id })
          .parent()
          .query().result
      ).toEqual([]);
    });
  });

  describe('links', () => {
    test('links from single item', () => {
      expect(
        rootSelector({ id: org1.id })
          .links()
          .query().result
      ).toEqual([
        links[0],
        links[1],
        links[2]
      ]);
    });

    test('links from multiple items', () => {
      expect(
        rootSelector({ type: OBJECT_ORG })
          .links()
          .query().result
      ).toEqual([
        links[0],
        links[1],
        links[2],
        links[3]
      ]);
    });

    test('targets', () => {
      expect(
        rootSelector({ id: org1.id })
          .links()
          .target()
          .query().result
      ).toEqual([
        person1,
        person2,
        person3
      ]);
    });

    test('sources', () => {
      expect(
        rootSelector({ type: OBJECT_PERSON })
          .refs()
          .source()
          .query().result
      ).toEqual([
        org1,
        org2
      ]);
    });
  });

  describe('events', () => {
    test('events get filtered correctly', async () => {
      const update = new Event<Entity[]>();
      const select = createRootSelector(() => items, () => update, null as any);

      const query = select({ type: OBJECT_ORG })
        .children()
        .query();

      {
        const promise = query.update.waitForCount(1);
        update.emit([person1]);
        await promiseTimeout(promise, 10, new Error('timeout'));
      }

      {
        const promise = query.update.waitForCount(1);
        update.emit([]);
        await expect(promiseTimeout(promise, 10, new Error('timeout'))).rejects.toThrow('timeout');
      }

      {
        const promise = query.update.waitForCount(1);
        update.emit([org1]);
        await expect(promiseTimeout(promise, 10, new Error('timeout'))).rejects.toThrow('timeout');
      }
    });
  });
});
