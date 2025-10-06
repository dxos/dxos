//
// Copyright 2025 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Filter } from '@dxos/echo';
import { ObjectStructure } from '@dxos/echo-protocol';
import { EXPANDO_TYPENAME, Expando, Ref } from '@dxos/echo-schema';
import { DXN, ObjectId, SpaceId } from '@dxos/keys';

import { type MatchedObject, filterMatchObject } from './filter-match';

describe('filterMatch', () => {
  test('everything', () => {
    expect(filterMatchObject(Filter.everything().ast, OBJECT_1)).to.be.true;
    expect(filterMatchObject(Filter.everything().ast, OBJECT_2)).to.be.true;
  });

  test('nothing', () => {
    expect(filterMatchObject(Filter.nothing().ast, OBJECT_1)).to.be.false;
    expect(filterMatchObject(Filter.nothing().ast, OBJECT_2)).to.be.false;
  });

  test('properties', () => {
    expect(filterMatchObject(Filter.type(Expando, { title: 'test' }).ast, OBJECT_1)).to.be.true;
    expect(filterMatchObject(Filter.type(Expando, { value: 100 }).ast, OBJECT_1)).to.be.true;
    expect(filterMatchObject(Filter.type(Expando, { complete: false }).ast, OBJECT_1)).to.be.false;
    expect(filterMatchObject(Filter.type(Expando, { missing: undefined }).ast, OBJECT_1)).to.be.true;
    expect(filterMatchObject(Filter.type(Expando, { properties: { subject: 'test' } }).ast, OBJECT_1)).to.be.true;
    expect(filterMatchObject(Filter.type(Expando, { array: Filter.contains('two') }).ast, OBJECT_1)).to.be.true;
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

  test('contains', () => {
    expect(filterMatchObject(Filter.type(Expando, { properties: { label: Filter.contains('test') } }).ast, OBJECT_1)).to
      .be.true;
    expect(
      filterMatchObject(
        Filter.type(Expando, { fields: Filter.contains({ label: 'label', value: 'test' }) }).ast,
        OBJECT_1,
      ),
    ).to.be.true;
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

  test('refs', () => {
    const filter = Filter.type(Expando, { parent: Ref.fromDXN(DXN.fromLocalObjectId(OBJECT_1.id)) });
    expect(filterMatchObject(filter.ast, OBJECT_1)).to.be.false;
    expect(filterMatchObject(filter.ast, OBJECT_2)).to.be.false;
    expect(filterMatchObject(filter.ast, OBJECT_3)).to.be.true;
  });
});

const OBJECT_1: MatchedObject = {
  id: ObjectId.make('01JVS9YYT5VMVJW0GGTM1YHCCH'),
  spaceId: SpaceId.make('B2NJDFNVZIW77OQSXUBNAD7BUMBD3G5PO'),
  doc: ObjectStructure.makeObject({
    type: DXN.fromTypenameAndVersion(EXPANDO_TYPENAME, '0.1.0').toString(),
    data: {
      title: 'test',
      value: 100,
      complete: true,
      array: ['one', 'two', 'three'],
      properties: { label: ['test'], subject: 'test' },
      fields: [{ label: 'label', value: 'test' }],
    },
  }),
};

const OBJECT_2: MatchedObject = {
  id: ObjectId.make('01JT5TD6K9FFJ3VNM5FGMS5C0Q'),
  spaceId: SpaceId.make('B2NJDFNVZIW77OQSXUBNAD7BUMBD3G5PO'),
  doc: ObjectStructure.makeObject({
    type: DXN.fromTypenameAndVersion(EXPANDO_TYPENAME, '0.1.0').toString(),
    data: { title: 'test', value: 100, complete: true },
    deleted: true,
  }),
};

const OBJECT_3: MatchedObject = {
  id: ObjectId.make('01JT5TD6K9FFJ3VNM5FGMS5C0Q'),
  spaceId: SpaceId.make('B2NJDFNVZIW77OQSXUBNAD7BUMBD3G5PO'),
  doc: ObjectStructure.makeObject({
    type: DXN.fromTypenameAndVersion(EXPANDO_TYPENAME, '0.1.0').toString(),
    data: { title: 'test', value: 100, complete: true, parent: { '/': DXN.fromLocalObjectId(OBJECT_1.id).toString() } },
  }),
};
