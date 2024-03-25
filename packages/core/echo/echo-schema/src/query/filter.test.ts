//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';

import { Reference } from '@dxos/echo-db';
import { PublicKey } from '@dxos/keys';
import { describe, test } from '@dxos/test';

import { compareType, Filter, filterMatch } from './filter';
import { getAutomergeObjectCore } from '../automerge';
import { Expando } from '../object';
import { Schema } from '../proto';

describe('Filter', () => {
  test('properties', () => {
    const object = new Expando({ title: 'test', value: 100, complete: true });
    const core = getAutomergeObjectCore(object);

    expect(filterMatch(Filter.from({ title: 'test' }), core)).to.be.true;
    expect(filterMatch(Filter.from({ value: 100 }), core)).to.be.true;
    expect(filterMatch(Filter.from({ complete: false }), core)).to.be.false;
    expect(filterMatch(Filter.from({ missing: undefined }), core)).to.be.true;
  });

  test('and', () => {
    const object = new Expando({ title: 'test', value: 100, complete: true });
    const core = getAutomergeObjectCore(object);

    const filter1 = Filter.from({ title: 'test' });
    const filter2 = Filter.from({ value: 100 });
    const filter3 = Filter.from({ complete: true });

    expect(filterMatch(Filter.and(filter1, filter2, filter3), core)).to.be.true;
    expect(filterMatch(Filter.from([filter1, filter2, filter3]), core)).to.be.true;
  });

  test('or', () => {
    const object = new Expando({ title: 'test', value: 100, complete: true });
    const core = getAutomergeObjectCore(object);

    const filter1 = Filter.from({ value: 200 });
    const filter2 = Filter.from({ title: 'test' });
    const filter3 = Filter.from({ complete: false });

    expect(filterMatch(Filter.or(filter1, filter2, filter3), core)).to.be.true;
  });

  test('not', () => {
    const object = new Expando({ title: 'test' });
    const core = getAutomergeObjectCore(object);

    const filter1 = Filter.from({ title: 'test' });
    const filter2 = Filter.not(filter1);

    expect(filterMatch(filter1, core)).to.be.true;
    expect(filterMatch(filter2, core)).to.be.false;
  });

  test('complex', () => {
    const object = new Expando({ title: 'test', value: 100, complete: true });
    const core = getAutomergeObjectCore(object);

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

  test('dynamic schema', () => {
    const schema = new Schema({
      typename: 'example.TestSchema',
    });

    const object = new Expando(
      {
        title: 'test',
      },
      { schema },
    );
    const core = getAutomergeObjectCore(object);
    expect(object.__schema).to.eq(schema);

    const filter = Filter.typename('example.TestSchema');
    expect(filterMatch(filter, core)).to.be.true;
  });
});
