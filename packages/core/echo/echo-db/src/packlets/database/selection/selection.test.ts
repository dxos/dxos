//
// Copyright 2020 DXOS.org
//

import expect from 'expect';

import { Event, asyncTimeout } from '@dxos/async';
import { PublicKey } from '@dxos/keys';
import { ModelFactory } from '@dxos/model-factory';
import { ObjectModel } from '@dxos/object-model';
import { ItemID, ItemType } from '@dxos/protocols';

import { Entity } from '../entity';
import { Item } from '../item';
import { Link } from '../link';
import { RootFilter } from './queries';
import { createSelection } from './selection';

// Use to prevent ultra-long diffs.
const ids = (entities: Entity[]) => entities.map((entity) => entity.id);

const modelFactory = new ModelFactory().registerModel(ObjectModel);

const createModel = (id: ItemID) => modelFactory.createModel(ObjectModel.meta.type, id, {}, PublicKey.random());

const createItem = (id: ItemID, type: ItemType, parent?: Item<any>) =>
  new Item(null as any, id, type, createModel(id), undefined, parent);

const createLink = (id: ItemID, type: ItemType, source: Item<any>, target: Item<any>) => {
  const link = new Link(null as any, id, type, createModel(id), {
    sourceId: source.id,
    targetId: target.id,
    source,
    target
  });

  source._links.add(link);
  target._refs.add(link);

  return link;
};

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

const links: Link<any>[] = [
  createLink('link/1', LINK_MEMBER, project1, person1),
  createLink('link/2', LINK_MEMBER, project1, person2),
  createLink('link/3', LINK_MEMBER, project2, person1),
  createLink('link/4', LINK_MEMBER, project2, person3)
];

// TODO(burdon): Test subscriptions/reactivity.

describe('Selection', function () {
  describe('root', function () {
    it('all', function () {
      expect(createRootSelection().exec().entities).toHaveLength(items.length);
    });

    it('by id', function () {
      expect(createRootSelection({ id: org1.id }).exec().entities).toEqual([org1]);

      expect(createRootSelection({ id: org2.id }).exec().entities).toEqual([org2]);
    });

    it('single type', function () {
      expect(createRootSelection({ type: ITEM_PROJECT }).exec().entities).toHaveLength(3);
    });

    it('multiple types', function () {
      expect(createRootSelection({ type: [ITEM_ORG, ITEM_PROJECT] }).exec().entities).toHaveLength(5);
    });
  });

  describe('filter', function () {
    it('invalid', function () {
      expect(createRootSelection().filter({ type: 'dxos:type/invalid' }).exec().entities).toHaveLength(0);
    });

    it('single type', function () {
      expect(createRootSelection().filter({ type: ITEM_PROJECT }).exec().entities).toHaveLength(3);
    });

    it('multiple types', function () {
      expect(
        createRootSelection()
          .filter({ type: [ITEM_ORG, ITEM_PROJECT] })
          .exec().entities
      ).toHaveLength(5);
    });

    it('by function', function () {
      expect(
        createRootSelection()
          .filter((item) => item.type === ITEM_ORG)
          .exec().entities
      ).toHaveLength(2);
    });
  });

  describe('children', function () {
    it('from multiple items', function () {
      expect(
        ids(createRootSelection().filter({ type: ITEM_ORG }).children({ type: ITEM_PROJECT }).exec().entities)
      ).toStrictEqual(ids([project1, project2, project3]));
    });

    it('from single item', function () {
      expect(ids(createRootSelection({ id: org1.id }).children().exec().entities)).toStrictEqual(
        ids([project1, project2, person1, person2])
      );
    });
  });

  describe('parent', function () {
    it('from multiple items', function () {
      expect(ids(createRootSelection().filter({ type: ITEM_PROJECT }).parent().exec().entities)).toStrictEqual(
        ids([org1, org2])
      );
    });

    it('from single item', function () {
      expect(ids(createRootSelection({ id: project1.id }).parent().exec().entities)).toStrictEqual(ids([org1]));
    });

    it('is empty', function () {
      expect(createRootSelection({ id: org1.id }).parent().exec().entities).toEqual([]);
    });
  });

  describe('links', function () {
    it('links from single item', function () {
      expect(ids(createRootSelection({ id: project1.id }).links().target().exec().entities)).toStrictEqual(
        ids([person1, person2])
      );
    });

    it('links from multiple items', function () {
      expect(createRootSelection({ type: ITEM_PROJECT }).links().exec().entities).toHaveLength(links.length);
    });

    it('sources', function () {
      expect(ids(createRootSelection({ type: ITEM_PERSON }).refs().source().exec().entities)).toStrictEqual(
        ids([project1, project2])
      );
    });
  });

  describe('reducer', function () {
    it('simple reducer', function () {
      const query = createReducer(0)
        .call((items, count) => count + items.length)
        .exec();
      expect(query.value).toEqual(items.length);
    });

    // TODO(burdon): Support nested traverals (context as third arg?)
    it('complex reducer', function () {
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
        .links({ type: LINK_MEMBER })
        .call((links: Link[], { numLinks, ...rest }) => ({
          ...rest,
          numLinks: numLinks + links.length,
          stage: 'c'
        }))
        .target()
        .exec();

      expect(query.value).toEqual({ numItems: 5, numLinks: 4, stage: 'c' });
    });
  });

  describe('events', function () {
    it('events get filtered correctly', async function () {
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
