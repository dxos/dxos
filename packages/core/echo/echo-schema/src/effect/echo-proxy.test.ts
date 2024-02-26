//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';

import { describe, test } from '@dxos/test';

import { createEchoReactiveObject } from './echo-handler';
import { updateCounter } from './testutils';

describe('ECHO backed reactive objects', () => {
  test('create object', () => {
    const obj = createEchoReactiveObject({ prop: 'foo' });
    expect(obj.prop).to.equal('foo');

    // const handler = getProxyHandlerSlot(obj).handler as EchoReactiveHandler;
    // log.info('am doc', { doc: handler._objectCore.getDoc() });
  });

  test('set', () => {
    const obj = createEchoReactiveObject({ prop: 'foo' });
    obj.prop = 'bar';
    expect(obj.prop).to.equal('bar');
  });

  test('signals', () => {
    const obj = createEchoReactiveObject({ prop: 'foo' });

    using updates = updateCounter(() => {
      obj.prop;
    });

    obj.prop = 'bar';
    expect(updates.count).to.equal(1);
  });

  test('nested', () => {
    const obj = createEchoReactiveObject({ nested: { prop: 'foo' } });
    expect(obj.nested.prop).to.equal('foo');

    using updates = updateCounter(() => {
      obj.nested.prop;
    });

    obj.nested.prop = 'bar';
    expect(obj.nested.prop).to.equal('bar');
    expect(updates.count).to.equal(1);
  });

  test('array', () => {
    const obj = createEchoReactiveObject({ arr: [1, 2, 3] });
    expect(obj.arr).to.deep.equal([1, 2, 3]);

    using updates = updateCounter(() => {
      obj.arr;
    });

    obj.arr.push(4);
    expect(obj.arr).to.deep.equal([1, 2, 3, 4]);
    expect(updates.count).to.equal(1);
  });

  // test('API examples', () => {
  //   const obj = E.object(Contact, {
  //     name: 'Rich Burton',
  //   });
  //   E.metaOf(obj).keys = [{ source: 'github.com', id: '123' }];

  //   obj.id;

  //   E.schemaOf(obj); // : Schema

  //   // META

  //   obj.meta;

  //   // E.metaOf(obj).lastUpdated
  // });
});
