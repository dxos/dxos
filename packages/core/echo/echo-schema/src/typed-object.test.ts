//
// Copyright 2022 DXOS.org
//

import { expect } from 'chai';

import { PublicKey } from '@dxos/keys';
import { describe, test } from '@dxos/test';

import { Expando, TypedObject } from './typed-object';
import { devtoolsFormatter } from '@dxos/debug';

describe('TypedObject', () => {
  test('instance of TypedObject', async () => {
    const obj = new TypedObject();
    expect(obj instanceof TypedObject).to.be.true;
  });

  test('instance of Expando', async () => {
    const obj1 = new Expando();
    expect(obj1 instanceof Expando).to.be.true;

    const obj2 = new Expando({ title: 'hello world' });
    expect(obj2.title).to.equal('hello world');

    const obj3 = new Expando(
      { title: 'hello world' },
      {
        meta: {
          keys: [
            {
              source: 'dxos.org',
              id: PublicKey.random().toHex(),
            },
          ],
        },
      },
    );

    console.log(obj3.__meta);
    console.log(JSON.stringify(obj3, null, 2));
    expect(obj3.__meta.keys[0].source).to.equal('dxos.org');
  });

  test('keys', () => {
    const obj = new Expando({ title: 'hello world', priority: 1 });
    expect(Object.keys(obj)).to.deep.equal(['title', 'priority']);
  });

  describe('meta', () => {
    test('meta keys', () => {
      const obj = new TypedObject();
      expect(Object.keys(obj.__meta)).to.deep.equal(['keys']);
      obj.__meta.index = '5';
      expect(Object.keys(obj.__meta)).to.deep.equal(['keys', 'index']);
    });
  });

  test('devtools formatter', () => {
    const obj = new TypedObject({ title: 'hello world' });
    
    expect(obj[devtoolsFormatter].header()).to.not.be.undefined;
    expect(obj[devtoolsFormatter].hasBody!()).to.be.true;
    expect(obj[devtoolsFormatter].body!()).to.not.be.undefined;
  })
});
