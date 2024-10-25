//
// Copyright 2023 DXOS.org
//

import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { type Reference } from '@dxos/echo-protocol';
import { create, S, TypedObject } from '@dxos/echo-schema';
import { QueryOptions } from '@dxos/protocols/proto/dxos/echo/filter';

import { Filter } from './filter';
import { filterMatch } from './filter-match';
import { ObjectCore } from '../core-db';
import { getObjectCore } from '../echo-handler';
import { EchoTestBuilder } from '../testing';

describe('Filter', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('properties', () => {
    const core = createAutomergeObjectCore({ title: 'test', value: 100, complete: true });

    expect(filterMatch(Filter.from({ title: 'test' }), core)).to.be.true;
    expect(filterMatch(Filter.from({ value: 100 }), core)).to.be.true;
    expect(filterMatch(Filter.from({ complete: false }), core)).to.be.false;
    expect(filterMatch(Filter.from({ missing: undefined }), core)).to.be.true;
  });

  test('and', () => {
    const core = createAutomergeObjectCore({ title: 'test', value: 100, complete: true });

    const filter1 = Filter.from({ title: 'test' });
    const filter2 = Filter.from({ value: 100 });
    const filter3 = Filter.from({ complete: true });

    expect(filterMatch(Filter.and(filter1, filter2, filter3), core)).to.be.true;
    expect(filterMatch(Filter.from([filter1, filter2, filter3]), core)).to.be.true;
  });

  test('or', () => {
    const core = createAutomergeObjectCore({ title: 'test', value: 100, complete: true });

    const filter1 = Filter.from({ value: 200 });
    const filter2 = Filter.from({ title: 'test' });
    const filter3 = Filter.from({ complete: false });

    expect(filterMatch(Filter.or(filter1, filter2, filter3), core)).to.be.true;
  });

  test('not', () => {
    const core = createAutomergeObjectCore({ title: 'test' });

    const filter1 = Filter.from({ title: 'test' });
    const filter2 = Filter.not(filter1);

    expect(filterMatch(filter1, core)).to.be.true;
    expect(filterMatch(filter2, core)).to.be.false;
  });

  test('not preserves deleted handling', () => {
    const core = createAutomergeObjectCore({ title: 'test' });
    core.setDeleted(true);
    const filter1 = Filter.from({ title: 'test' }, { deleted: QueryOptions.ShowDeletedOption.HIDE_DELETED });
    const filter2 = Filter.not(filter1);

    expect(filterMatch(filter1, core)).to.be.false;
    expect(filterMatch(filter2, core)).to.be.false;
  });

  test('complex', () => {
    const core = createAutomergeObjectCore({ title: 'test', value: 100, complete: true });

    const filter1 = Filter.from({ title: 'bad' });
    const filter2 = Filter.from({ value: 0 });
    expect(filterMatch(Filter.not(Filter.or(filter1, filter2)), core)).to.be.true;
  });

  test('dynamic schema', async () => {
    class GeneratedSchema extends TypedObject({ typename: 'example.com/dynamic', version: '0.1.0' })({
      title: S.String,
    }) {}
    const { db } = await builder.createDatabase();
    const schema = db.schema.addSchema(GeneratedSchema);
    const obj = db.add(create(schema, { title: 'test' }));
    const filter = Filter.schema(schema);
    expect(filterMatch(filter, getObjectCore(obj))).to.be.true;
  });

  test('__typename', () => {
    const filter = Filter.from({ __typename: 'example.com/type/Type' });
    expect(filter.type![0].toString()).to.equal('dxn:type:example.com/type/Type');
    expect(filter.properties).to.deep.equal({});
  });
});

const createAutomergeObjectCore = (props: any = {}, type?: Reference): ObjectCore => {
  const core = new ObjectCore();
  core.initNewObject(props);
  if (type) {
    core.setType(type);
  }

  return core;
};
