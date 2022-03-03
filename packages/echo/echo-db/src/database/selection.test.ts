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
import { createSelector } from './selection';

// Use to prevent ultra-long diffs.
const ids = (entities: Entity[]) => entities.map(entity => entity.id);

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

const createRootSelector = createSelector(() => items, () => new Event(), null as any);

const createReducer = (value: any) => createSelector(() => items, () => new Event(), null as any, value)();

// TODO(burdon): Use more complex data set (org, person, project, task).

const ITEM_ORG = 'example:item/org';
const ITEM_PROJECT = 'example:item/project';
const ITEM_PERSON = 'example:item/person';
const LINK_MEMBER = 'example:link/member';

const org1 = createItem('org/1', ITEM_ORG);
const org2 = createItem('org/2', ITEM_ORG);

const project1 = createItem('project/1', ITEM_PROJECT, org1);
const project2 = createItem('project/2', ITEM_PROJECT, org1);
const project3 = createItem('project/3', ITEM_PROJECT, org2);

const person1 = createItem('person/1', ITEM_PERSON, org1);
const person2 = createItem('person/2', ITEM_PERSON, org1);
const person3 = createItem('person/3', ITEM_PERSON, org2);
const person4 = createItem('person/4', ITEM_PERSON, org2);

const items: Item<any>[] = [
  org1,
  org2,
  project1,
  project2,
  project3,
  person1,
  person2,
  person3,
  person4
];

const links: Link<any>[] = [
  createLink('link/1', LINK_MEMBER, project1, person1),
  createLink('link/2', LINK_MEMBER, project1, person2),
  createLink('link/3', LINK_MEMBER, project2, person1),
  createLink('link/4', LINK_MEMBER, project2, person3)
];

// TODO(burdon): Test subscriptions/reactivity.

describe('Selection', () => {
  describe('root', () => {
    test('all', () => {
      expect(
        createRootSelector()
          .query().result
      ).toHaveLength(items.length);
    });

    test('by id', () => {
      expect(
        createRootSelector({ id: org1.id })
          .query().result
      ).toEqual([org1]);

      expect(
        createRootSelector({ id: org2.id })
          .query().result
      ).toEqual([org2]);
    });

    test('single type', () => {
      expect(
        createRootSelector({ type: ITEM_PROJECT })
          .query().result
      ).toHaveLength(3);
    });

    test('multiple types', () => {
      expect(
        createRootSelector({ type: [ITEM_ORG, ITEM_PROJECT] })
          .query().result
      ).toHaveLength(5);
    });
  });

  describe('filter', () => {
    test('invalid', () => {
      expect(
        createRootSelector()
          .filter({ type: 'dxos:type.invalid' })
          .query().result
      ).toHaveLength(0);
    });

    test('single type', () => {
      expect(
        createRootSelector()
          .filter({ type: ITEM_PROJECT })
          .query().result
      ).toHaveLength(3);
    });

    test('multiple types', () => {
      expect(
        createRootSelector()
          .filter({ type: [ITEM_ORG, ITEM_PROJECT] })
          .query().result
      ).toHaveLength(5);
    });

    test('by function', () => {
      expect(
        createRootSelector()
          .filter(item => item.type === ITEM_ORG)
          .query().result
      ).toHaveLength(2);
    });
  });

  describe('children', () => {
    test('from multiple items', () => {
      expect(ids(
        createRootSelector()
          .filter({ type: ITEM_ORG })
          .children({ type: ITEM_PROJECT })
          .query().result
      )).toStrictEqual(ids([
        project1,
        project2,
        project3
      ]));
    });

    test('from single item', () => {
      expect(ids(
        createRootSelector({ id: org1.id })
          .children()
          .query().result
      )).toStrictEqual(ids([
        project1,
        project2,
        person1,
        person2
      ]));
    });
  });

  describe('parent', () => {
    test('from multiple items', () => {
      expect(ids(
        createRootSelector()
          .filter({ type: ITEM_PROJECT })
          .parent()
          .query().result
      )).toStrictEqual(ids([
        org1,
        org2
      ]));
    });

    test('from single item', () => {
      expect(ids(
        createRootSelector({ id: project1.id })
          .parent()
          .query().result
      )).toStrictEqual(ids([
        org1
      ]));
    });

    test('is empty', () => {
      expect(
        createRootSelector({ id: org1.id })
          .parent()
          .query().result
      ).toEqual([]);
    });
  });

  describe('links', () => {
    test('links from single item', () => {
      expect(ids(
        createRootSelector({ id: project1.id })
          .links()
          .target()
          .query().result
      )).toStrictEqual(ids([
        person1,
        person2
      ]));
    });

    test('links from multiple items', () => {
      expect(
        createRootSelector({ type: ITEM_PROJECT })
          .links()
          .query().result
      ).toHaveLength(links.length);
    });

    test('sources', () => {
      expect(ids(
        createRootSelector({ type: ITEM_PERSON })
          .refs()
          .source()
          .query().result
      )).toStrictEqual(ids([
        project1,
        project2
      ]));
    });
  });

  describe('call', () => {
    // TODO(burdon): Test links.
    // TODO(burdon): Test visitor with no value.
    // TODO(burdon): What if reduce called multiple times (change API?).
    // TODO(burdon): Get context (selection) as second arg? For nested traversal.
    test('visitor', () => {
      const query = createReducer({ numItems: 0, numLinks: 0 })
        .filter({ type: ITEM_ORG })
        .call((items: Item[], { numItems, ...rest }) => {
          return { ...rest, numItems: numItems + items.length, stage: 'a' };
        })
        .children({ type: ITEM_PROJECT })
        .call((items: Item[], { numItems, ...rest }) => {
          return { ...rest, numItems: numItems + items.length, stage: 'c' };
        })
        .links({ type: LINK_MEMBER })
        .call((links: Link[], { numLinks, ...rest }) => {
          return { ...rest, numLinks: numLinks + links.length, stage: 'c' };
        })
        .target()
        .query(); // TODO(burdon): Different verb?

      expect(ids(query.result)).toStrictEqual(ids([person1, person2, person3]));
      expect(query.value).toEqual({ numItems: 5, numLinks: 4, stage: 'c' });
    });
  });

  describe('events', () => {
    test('events get filtered correctly', async () => {
      const update = new Event<Entity[]>();
      const select = createSelector(() => items, () => update, null as any);

      const query = select({ type: ITEM_ORG })
        .children()
        .query();

      {
        const promise = query.update.waitForCount(1);
        update.emit([project1]);
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
