//
// Copyright 2021 DXOS.org
//

import { expect } from 'chai';

import { DXN } from '../dxn';
import { IRegistryApi } from '../registry-api';
import { createMockResource, createMockTypes } from './fake-data-generator';
import { MemoryRegistryApi } from './mock-registry-api';

describe('Registry API mock', () => {
  let mock: IRegistryApi;

  beforeEach(() => {
    mock = new MemoryRegistryApi();
  });

  it('Returns a specific resource', async () => {
    const dxn = 'example:resource';
    const resource = createMockResource(DXN.parse(dxn));
    mock = new MemoryRegistryApi(createMockTypes(), [resource]);
    // Parse the query DXN separately to ensure it is not the same instance
    // as the resource DXN
    const registryResource = await mock.getResource(DXN.parse(dxn));
    expect(registryResource).to.be.deep.equal(resource);
  });

  it('Returns predefined resources', async () => {
    const resources = await mock.getResources({});

    expect(resources.length).to.be.equal(30);
  });

  it('Returns predefined types', async () => {
    const types = await mock.getTypeRecords();
    const typeNames = types.map(type => type.messageName).sort();

    expect(typeNames).to.be.deep.equal([
      'app',
      'bot',
      'dxos.type.IPFS',
      'dxos.type.KUBE',
      'dxos.type.Service',
      'file'
    ]);
  });
});
