//
// Copyright 2020 DXOS.org
//

import expect from 'expect';

import { Event, asyncTimeout } from '@dxos/async';
import { PublicKey } from '@dxos/keys';
import { ModelFactory } from '@dxos/model-factory';
import { ObjectModel } from '@dxos/object-model';
import { ItemID, ItemType } from '@dxos/protocols';
import { describe, test } from '@dxos/test';

import { Entity } from '../entity';
import { Item } from '../item';
import { RootFilter } from './queries';
import { createSelection } from './selection';

// Use to prevent ultra-long diffs.
const ids = (entities: Entity[]) => entities.map((entity) => entity.id);

const modelFactory = new ModelFactory().registerModel(ObjectModel);

const createModel = (id: ItemID) =>
  modelFactory.createModel(ObjectModel.meta.type, id, { itemId: id }, PublicKey.random());

const createItem = (id: ItemID, type: ItemType, parent?: Item<any>) =>
  new Item(null as any, id, type, createModel(id), undefined, parent);

const createRootSelection = (filter?: RootFilter) =>
  createSelection<void>(
    () => items,
    () => new Event(),
    null as any,
    filter,
    undefined
  );

const createReducer = <R>(result: R) =>
  createSelection<R>(
    () => items,
    () => new Event(),
    null as any,
    undefined,
    result
  );

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

const items: Item<any>[] = [org1, org2, project1, project2, project3, person1, person2, person3, person4];

// TODO(burdon): Test subscriptions/reactivity.

describe('Selection', () => {
  describe('root', () => {
    test('all', () => {
      expect(createRootSelection().exec().entities).toHaveLength(items.length);
    });

    test('by id', () => {
      expect(createRootSelection({ id: org1.id }).exec().entities).toEqual([org1]);

      expect(createRootSelection({ id: org2.id }).exec().entities).toEqual([org2]);
    });

    test('single type', () => {
      expect(createRootSelection({ type: ITEM_PROJECT }).exec().entities).toHaveLength(3);
    });

    test('multiple types', () => {
      expect(createRootSelection({ type: [ITEM_ORG, ITEM_PROJECT] }).exec().entities).toHaveLength(5);
    });
  });

  describe('filter', () => {
    test('invalid', () => {
      expect(createRootSelection().filter({ type: 'dxos:type/invalid' }).exec().entities).toHaveLength(0);
    });

    test('single type', () => {
      expect(createRootSelection().filter({ type: ITEM_PROJECT }).exec().entities).toHaveLength(3);
    });

    test('multiple types', () => {
      expect(
        createRootSelection()
          .filter({ type: [ITEM_ORG, ITEM_PROJECT] })
          .exec().entities
      ).toHaveLength(5);
    });

    test('by function', () => {
      expect(
        createRootSelection()
          .filter((item) => item.type === ITEM_ORG)
          .exec().entities
      ).toHaveLength(2);
    });
  });

  describe('children', () => {
    test('from multiple items', () => {
      expect(
        ids(createRootSelection().filter({ type: ITEM_ORG }).children({ type: ITEM_PROJECT }).exec().entities)
      ).toStrictEqual(ids([project1, project2, project3]));
    });

    test('from single item', () => {
      expect(ids(createRootSelection({ id: org1.id }).children().exec().entities)).toStrictEqual(
        ids([project1, project2, person1, person2])
      );
    });
  });

  describe('parent', () => {
    test('from multiple items', () => {
      expect(ids(createRootSelection().filter({ type: ITEM_PROJECT }).parent().exec().entities)).toStrictEqual(
        ids([org1, org2])
      );
    });

    test('from single item', () => {
      expect(ids(createRootSelection({ id: project1.id }).parent().exec().entities)).toStrictEqual(ids([org1]));
    });

    test('is empty', () => {
      expect(createRootSelection({ id: org1.id }).parent().exec().entities).toEqual([]);
    });
  });

  describe('reducer', () => {
    test('simple reducer', () => {
      const query = createReducer(0)
        .call((items, count) => count + items.length)
        .exec();
      expect(query.value).toEqual(items.length);
    });

    // TODO(burdon): Support nested traverals (context as third arg?)
    test('complex reducer', () => {
      const query = createReducer({ numItems: 0, numLinks: 0 })
        .filter({ type: ITEM_ORG })
        .call((items: Item[], { numItems, ...rest }) => ({
          ...rest,
          numItems: numItems + items.length,
          stage: 'a'
        }))
        .children({ type: ITEM_PROJECT })
        .call((items: Item[], { numItems, ...rest }) => ({
          ...rest,
          numItems: numItems + items.length,
          stage: 'b'
        }))
        .exec();

      expect(query.value).toEqual({ numItems: 5, numLinks: 4, stage: 'c' });
    });
  });

  describe('events', () => {
    test('events get filtered correctly', async () => {
      const update = new Event<Entity[]>();

      const query = createSelection<void>(
        () => items,
        () => update,
        null as any,
        { type: ITEM_ORG },
        undefined
      )
        .children()
        .exec();

      {
        const promise = query.update.waitForCount(1);
        update.emit([project1]);
        await asyncTimeout(promise, 10, new Error('timeout'));
      }

      {
        const promise = query.update.waitForCount(1);
        update.emit([]);
        await expect(asyncTimeout(promise, 10, new Error('timeout'))).rejects.toThrow('timeout');
      }

      {
        const promise = query.update.waitForCount(1);
        update.emit([org1]);
        await expect(asyncTimeout(promise, 10, new Error('timeout'))).rejects.toThrow('timeout');
      }
    });
  });
});
