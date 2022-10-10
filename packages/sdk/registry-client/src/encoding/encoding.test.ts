//
// Copyright 2021 DXOS.org
//

import { expect } from 'chai';

import { raise } from '@dxos/debug';

import { createCID, createMockTypes } from '../testing/index.js';
import {
  decodeExtensionPayload,
  encodeExtensionPayload
} from './encoding.js';

describe('Record encoding', function () {
  const mockTypes = createMockTypes();
  const serviceType = mockTypes.find(({ type }) => type?.messageName === '.dxos.type.Service') ?? raise(new Error());
  const ipfsType = mockTypes.find(({ type }) => type?.messageName === '.dxos.type.IPFS') ?? raise(new Error());
  const lookupType = async cid => mockTypes.find(type => type.cid.equals(cid)) ?? raise(new Error('Not found.'));

  it('record without extensions', async function () {
    const data = {
      '@type': serviceType.cid,
      'type': 'foo',
      'kube': createCID().value
    };
    const encoded = await encodeExtensionPayload(data, lookupType);

    expect(encoded.typeRecord).to.deep.eq(serviceType.cid.value);
    expect(encoded.data).to.be.instanceOf(Uint8Array);

    const decoded = await decodeExtensionPayload(encoded, lookupType);

    expect(decoded).to.deep.eq(data);
  });

  it('record with extensions', async function () {
    const data = {
      '@type': serviceType.cid,
      'type': 'ipfs',
      'kube': createCID().value,
      'extension': {
        '@type': ipfsType.cid,
        'protocol': 'ipfs/0.1.0',
        'addresses': [
          '/ip4/123.123.123.123/tcp/5566'
        ]
      }
    };

    const encoded = await encodeExtensionPayload(data, lookupType);
    expect(encoded.typeRecord).to.deep.eq(serviceType.cid.value);
    expect(encoded.data).to.be.instanceOf(Uint8Array);

    const decoded = await decodeExtensionPayload(encoded, lookupType);
    expect(decoded).to.deep.eq(data);
  });
});
