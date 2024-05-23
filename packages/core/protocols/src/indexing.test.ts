//
// Copyright 2022 DXOS.org
//

import { expect } from 'chai';

import { describe, test } from '@dxos/test';

import { ObjectPointerVersion, objectPointerCodec } from './indexing';

describe('Indexing object pointer codec', () => {
  test('getVersion', async () => {
    expect(objectPointerCodec.getVersion('aaaa|bbbb')).to.eq(ObjectPointerVersion.V0);
    expect(objectPointerCodec.getVersion('#01|ssss|aaaa|bbbb')).to.eq(ObjectPointerVersion.V1);
  });

  test('v0', async () => {
    expect(objectPointerCodec.encode({ spaceKey: undefined, documentId: 'aaaa', objectId: 'bbbb' })).to.eq('aaaa|bbbb');
    expect(objectPointerCodec.decode('aaaa|bbbb')).to.eql({
      spaceKey: undefined,
      documentId: 'aaaa',
      objectId: 'bbbb',
    });
  });

  test('v1', async () => {
    expect(objectPointerCodec.encode({ spaceKey: 'ssss', documentId: 'aaaa', objectId: 'bbbb' })).to.eq(
      '#01|ssss|aaaa|bbbb',
    );
    expect(objectPointerCodec.decode('#01|ssss|aaaa|bbbb')).to.eql({
      spaceKey: 'ssss',
      documentId: 'aaaa',
      objectId: 'bbbb',
    });
  });
});
