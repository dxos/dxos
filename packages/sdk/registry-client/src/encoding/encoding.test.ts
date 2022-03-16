//
// Copyright 2021 DXOS.org
//

import { expect } from 'chai';
import * as protobuf from 'protobufjs';

import { raise } from '@dxos/debug';

import { schemaJson } from '../proto';
import { createCID, createMockTypes } from '../testing';
import {
  convertSchemaToDescriptor,
  decodeExtensionPayload,
  encodeExtensionPayload,
  loadSchemaFromDescriptor
} from './encoding';

describe('Proto utils', () => {
  it('can convert schema to descriptor and back', () => {
    const root = protobuf.Root.fromJSON(schemaJson);
    const descriptor = convertSchemaToDescriptor(root);
    const newSchema = loadSchemaFromDescriptor(descriptor);

    expect(newSchema.lookupType('.dxos.registry.Record')).to.not.be.undefined;
    expect(newSchema.lookupType('.dxos.registry.Record.Type')).to.not.be.undefined;
    expect(newSchema.lookupType('.dxos.registry.Record.Extension')).to.not.be.undefined;
  });
});

describe('Record encoding', () => {
  const mockTypes = createMockTypes();
  const serviceType = mockTypes.find(type => type.messageName === '.dxos.type.Service') ?? raise(new Error());
  const ipfsType = mockTypes.find(type => type.messageName === '.dxos.type.IPFS') ?? raise(new Error());
  const lookupType = async cid => mockTypes.find(type => type.cid.equals(cid)) ?? raise(new Error('Not found.'));

  it('record without extensions', async () => {
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

  it('record with extensions', async () => {
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
