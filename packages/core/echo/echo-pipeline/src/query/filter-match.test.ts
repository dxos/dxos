import { Expando, EXPANDO_TYPENAME, Filter } from '@dxos/echo-schema';
import { DXN, ObjectId, SpaceId } from '@dxos/keys';
import { describe, expect, test } from 'vitest';
import { filterMatchObject, type MatchedObject } from './filter-match';

describe('filterMatch', () => {
  test('properties', () => {
    expect(filterMatchObject(Filter.type(Expando, { title: 'test' }).ast, OBJECT_1)).to.be.true;
    expect(filterMatchObject(Filter.type(Expando, { value: 100 }).ast, OBJECT_1)).to.be.true;
    expect(filterMatchObject(Filter.type(Expando, { complete: false }).ast, OBJECT_1)).to.be.false;
    expect(filterMatchObject(Filter.type(Expando, { missing: undefined }).ast, OBJECT_1)).to.be.true;
  });

  test('and', () => {
    const filter1 = Filter.type(Expando, { title: 'test' });
    const filter2 = Filter.type(Expando, { value: 100 });
    const filter3 = Filter.type(Expando, { complete: true });

    expect(filterMatchObject(Filter.and(filter1, filter2, filter3).ast, OBJECT_1)).to.be.true;
  });

  test('or', () => {
    const filter1 = Filter.type(Expando, { value: 200 });
    const filter2 = Filter.type(Expando, { title: 'test' });
    const filter3 = Filter.type(Expando, { complete: false });

    expect(filterMatchObject(Filter.or(filter1, filter2, filter3).ast, OBJECT_1)).to.be.true;
  });

  test('not', () => {
    const filter1 = Filter.type(Expando, { title: 'test' });
    const filter2 = Filter.not(filter1);

    expect(filterMatchObject(filter1.ast, OBJECT_1)).to.be.true;
    expect(filterMatchObject(filter2.ast, OBJECT_1)).to.be.false;
  });

  test('complex', () => {
    const filter1 = Filter.type(Expando, { title: 'bad' });
    const filter2 = Filter.type(Expando, { value: 0 });
    expect(filterMatchObject(Filter.not(Filter.or(filter1, filter2)).ast, OBJECT_1)).to.be.true;
  });

  test('ids', () => {
    const filter = Filter.ids(OBJECT_1.id);
    expect(filterMatchObject(filter.ast, OBJECT_1)).to.be.true;
    expect(filterMatchObject(filter.ast, OBJECT_2)).to.be.false;
  });

  test('everything', () => {
    expect(filterMatchObject(Filter.everything().ast, OBJECT_1)).to.be.true;
    expect(filterMatchObject(Filter.everything().ast, OBJECT_2)).to.be.true;
  });

  test('nothing', () => {
    expect(filterMatchObject(Filter.nothing().ast, OBJECT_1)).to.be.false;
    expect(filterMatchObject(Filter.nothing().ast, OBJECT_2)).to.be.false;
  });
});

const OBJECT_1: MatchedObject = {
  id: ObjectId.make('01JVS9YYT5VMVJW0GGTM1YHCCH'),
  spaceId: SpaceId.make('B2NJDFNVZIW77OQSXUBNAD7BUMBD3G5PO'),
  doc: {
    system: {
      type: { '/': DXN.fromTypenameAndVersion(EXPANDO_TYPENAME, '0.1.0').toString() },
    },
    meta: { keys: [] },
    data: { title: 'test', value: 100, complete: true },
  },
};

const OBJECT_2: MatchedObject = {
  id: ObjectId.make('01JT5TD6K9FFJ3VNM5FGMS5C0Q'),
  spaceId: SpaceId.make('B2NJDFNVZIW77OQSXUBNAD7BUMBD3G5PO'),
  doc: {
    system: {
      type: { '/': DXN.fromTypenameAndVersion(EXPANDO_TYPENAME, '0.1.0').toString() },
      deleted: true,
    },
    meta: { keys: [] },
    data: { title: 'test', value: 100, complete: true },
  },
};
