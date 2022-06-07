//
// Copyright 2021 DXOS.org
//

import { expect } from 'chai';
import * as protobuf from 'protobufjs';

import { raise } from '@dxos/debug';

import { schemaJson } from '../proto';
import { createCID, createMockTypes } from '../testing';
import { CID, RegistryType } from '../types';
import {
  convertSchemaToDescriptor,
  decodeExtensionPayload,
  decodeProtobuf,
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
  const mockTypes: [CID, RegistryType][] = createMockTypes().map(type => [
    createCID(),
    {
      messageName: type.type!.messageName!,
      protobufDefs: decodeProtobuf(type.type!.protobufDefs!)
    }
  ]);
  const [serviceCid] = mockTypes.find(([, type]) => type?.messageName === '.dxos.type.Service') ?? raise(new Error());
  const [ipfsCid] = mockTypes.find(([, type]) => type?.messageName === '.dxos.type.IPFS') ?? raise(new Error());
  const lookupType = async cid => mockTypes.find(([typeCid]) => typeCid.equals(cid))?.[1] ?? raise(new Error('Not found.'));

  it('record without extensions', async () => {
    const data = {
      '@type': serviceCid,
      'type': 'foo',
      'kube': createCID().value
    };
    const encoded = await encodeExtensionPayload(data, lookupType);

    expect(encoded.typeRecord).to.deep.eq(serviceCid.value);
    expect(encoded.data).to.be.instanceOf(Uint8Array);

    const decoded = await decodeExtensionPayload(encoded, lookupType);

    expect(decoded).to.deep.eq(data);
  });

  it('record with extensions', async () => {
    const data = {
      '@type': serviceCid,
      'type': 'ipfs',
      'kube': createCID().value,
      'extension': {
        '@type': ipfsCid,
        'protocol': 'ipfs/0.1.0',
        'addresses': [
          '/ip4/123.123.123.123/tcp/5566'
        ]
      }
    };

    const encoded = await encodeExtensionPayload(data, lookupType);
    expect(encoded.typeRecord).to.deep.eq(serviceCid.value);
    expect(encoded.data).to.be.instanceOf(Uint8Array);

    const decoded = await decodeExtensionPayload(encoded, lookupType);
    expect(decoded).to.deep.eq(data);
  });
});
