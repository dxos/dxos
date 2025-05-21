import type { ObjectStructure } from '@dxos/echo-protocol';
import { expect } from 'vitest';
import { describe, test } from 'vitest';
import { filterMatch, type MatchedObject } from './filter-match';
import { ObjectId, SpaceId } from '@dxos/keys';
import { Expando, EXPANDO_TYPENAME, Filter } from '@dxos/echo-schema';

describe('filterMatch', () => {
  test('properties', () => {
    expect(filterMatch(Filter.type(Expando, { title: 'test' }).ast, OBJECT_1)).to.be.true;
    expect(filterMatch(Filter.type(Expando, { value: 100 }).ast, OBJECT_1)).to.be.true;
    expect(filterMatch(Filter.type(Expando, { complete: false }).ast, OBJECT_1)).to.be.false;
    expect(filterMatch(Filter.type(Expando, { missing: undefined }).ast, OBJECT_1)).to.be.true;
  });

  test('and', () => {
    const filter1 = Filter.type(Expando, { title: 'test' });
    const filter2 = Filter.type(Expando, { value: 100 });
    const filter3 = Filter.type(Expando, { complete: true });

    expect(filterMatch(Filter.and(filter1, filter2, filter3).ast, OBJECT_1)).to.be.true;
  });

  test('or', () => {
    const filter1 = Filter.type(Expando, { value: 200 });
    const filter2 = Filter.type(Expando, { title: 'test' });
    const filter3 = Filter.type(Expando, { complete: false });

    expect(filterMatch(Filter.or(filter1, filter2, filter3).ast, OBJECT_1)).to.be.true;
  });

  test('not', () => {
    const filter1 = Filter.type(Expando, { title: 'test' });
    const filter2 = Filter.not(filter1);

    expect(filterMatch(filter1.ast, OBJECT_1)).to.be.true;
    expect(filterMatch(filter2.ast, OBJECT_1)).to.be.false;
  });

  test('deleted objects', () => {
    const filter = Filter.type(Expando, { title: 'test' });
    expect(filterMatch(filter.ast, OBJECT_2)).to.be.false;
  });

  test('complex', () => {
    const filter1 = Filter.type(Expando, { title: 'bad' });
    const filter2 = Filter.type(Expando, { value: 0 });
    expect(filterMatch(Filter.not(Filter.or(filter1, filter2)).ast, OBJECT_1)).to.be.true;
  });

  test('ids', () => {
    const filter = Filter.ids(OBJECT_1.id);
    expect(filterMatch(filter.ast, OBJECT_1)).to.be.true;
    expect(filterMatch(filter.ast, OBJECT_2)).to.be.false;
  });

  test('everything', () => {
    expect(filterMatch(Filter.everything().ast, OBJECT_1)).to.be.true;
    expect(filterMatch(Filter.everything().ast, OBJECT_2)).to.be.true;
  });

  test('nothing', () => {
    expect(filterMatch(Filter.nothing().ast, OBJECT_1)).to.be.false;
    expect(filterMatch(Filter.nothing().ast, OBJECT_2)).to.be.false;
  });
});

const OBJECT_1: MatchedObject = {
  id: ObjectId.make('01JVS9YYT5VMVJW0GGTM1YHCCH'),
  spaceId: SpaceId.make('01JVS9YYT5VMVJW0GGTM1YHCCH'),
  doc: {
    system: {
      type: { '/': EXPANDO_TYPENAME },
    },
    meta: { keys: [] },
    data: { title: 'test', value: 100, complete: true },
  },
};

const OBJECT_2: MatchedObject = {
  id: ObjectId.make('01JVS9YYT5VMVJW0GGTM1YHCCH'),
  spaceId: SpaceId.make('01JVS9YYT5VMVJW0GGTM1YHCCH'),
  doc: {
    system: {
      type: { '/': EXPANDO_TYPENAME },
      deleted: true,
    },
    meta: { keys: [] },
    data: { title: 'test', value: 100, complete: true },
  },
};
