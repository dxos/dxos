//
// Copyright 2023 DXOS.org
//

import * as S from '@effect/schema/Schema';
import { expect } from 'chai';

import { Reference, TypedObject, create } from '@dxos/echo-schema';
import { PublicKey } from '@dxos/keys';
import { describe, test } from '@dxos/test';

import { compareType, Filter, filterMatch } from './filter';
import { AutomergeObjectCore, getAutomergeObjectCore } from '../automerge';
import { createDatabase } from '../testing';

describe('Filter', () => {
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

  test('complex', () => {
    const core = createAutomergeObjectCore({ title: 'test', value: 100, complete: true });

    const filter1 = Filter.from({ title: 'bad' });
    const filter2 = Filter.from({ value: 0 });
    expect(filterMatch(Filter.not(Filter.or(filter1, filter2)), core)).to.be.true;
  });

  // TODO(burdon): Test schema.

  test('compare types', () => {
    const spaceKey = PublicKey.random();
    const itemId = PublicKey.random().toHex();

    expect(compareType(new Reference(itemId, undefined, spaceKey.toHex()), new Reference(itemId), spaceKey)).to.be.true;
    expect(compareType(new Reference(itemId, undefined, spaceKey.toHex()), new Reference(itemId), PublicKey.random()))
      .to.be.false;

    expect(
      compareType(
        Reference.fromLegacyTypename('dxos.sdk.client.Properties'),
        Reference.fromLegacyTypename('dxos.sdk.client.Properties'),
        spaceKey,
      ),
    ).to.be.true;
    expect(
      compareType(
        Reference.fromLegacyTypename('dxos.sdk.client.Properties'),
        Reference.fromLegacyTypename('dxos.sdk.client.Test'),
        spaceKey,
      ),
    ).to.be.false;

    // Missing host on items created on some versions.
    expect(
      compareType(
        Reference.fromLegacyTypename('dxos.sdk.client.Properties'),
        new Reference('dxos.sdk.client.Properties', 'protobuf', undefined),
        spaceKey,
      ),
    ).to.be.true;
  });

  test('dynamic schema', async () => {
    class GeneratedSchema extends TypedObject({ typename: 'dynamic', version: '0.1.0' })({ title: S.string }) {}

    const { db } = await createDatabase();
    const schema = db.schemaRegistry.add(GeneratedSchema);

    const obj = db.add(create(schema, { title: 'test' }));

    const filter = Filter.typename(schema.id);
    expect(filterMatch(filter, getAutomergeObjectCore(obj))).to.be.true;
  });
});

const createAutomergeObjectCore = (props: any = {}, type?: Reference): AutomergeObjectCore => {
  const core = new AutomergeObjectCore();
  core.initNewObject(props);
  if (type) {
    core.setType(type);
  }
  return core;
};
