//
// Copyright 2021 DXOS.org
//

import { expect } from 'chai';

import { raise } from '@dxos/util';

import { createCID, createMockTypes } from '.';
import { decodeExtensionPayload, encodeExtensionPayload } from './encoding';

describe('record encoding', () => {
  const mockTypes = createMockTypes();

  const serviceType = mockTypes.find(type => type.messageName === 'dxos.type.Service') ?? raise(new Error());
  const ipfsType = mockTypes.find(type => type.messageName === 'dxos.type.IPFS') ?? raise(new Error());

  const lookupType = async cid => mockTypes.find(type => type.recordCID.equals(cid)) ?? raise(new Error('Not found'));

  it('record without extensions', async () => {
    const data = {
      '@type': serviceType.recordCID,
      type: 'foo',
      kube: createCID().value
    };
    const encoded = await encodeExtensionPayload(data, lookupType);

    expect(encoded.typeRecord).to.deep.eq(serviceType.recordCID.value);
    expect(encoded.data).to.be.instanceOf(Uint8Array);

    const decoded = await decodeExtensionPayload(encoded, lookupType);

    expect(decoded).to.deep.eq(data);
  });

  it('record with extensions', async () => {
    const data = {
      '@type': serviceType.recordCID,
      type: 'ipfs',
      kube: createCID().value,
      extension: {
        '@type': ipfsType.recordCID,
        protocol: 'ipfs/0.1.0',
        addresses: [
          '/ip4/123.123.123.123/tcp/5566'
        ]
      }
    };
    const encoded = await encodeExtensionPayload(data, lookupType);

    expect(encoded.typeRecord).to.deep.eq(serviceType.recordCID.value);
    expect(encoded.data).to.be.instanceOf(Uint8Array);

    const decoded = await decodeExtensionPayload(encoded, lookupType);

    expect(decoded).to.deep.eq(data);
  });
});
