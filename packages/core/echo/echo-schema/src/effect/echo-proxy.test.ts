import { describe, test } from '@dxos/test';
import { EchoReactiveHandler, createEchoReactiveObject } from './echo-handler';
import { expect } from 'chai';
import { log } from '@dxos/log';
import { getProxyHandlerSlot } from './proxy';

describe.only('ECHO backed reactive objects', () => {
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
