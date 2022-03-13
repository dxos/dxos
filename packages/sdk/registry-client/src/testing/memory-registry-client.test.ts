//
// Copyright 2021 DXOS.org
//

import { expect } from 'chai';

import { IRegistryClient } from '../registry-client-types';
import { DXN } from '../types';
import { createMockResourceRecord } from './fake-data-generator';
import { MemoryRegistryClient } from './memory-registry-client';

describe('Registry API mock', () => {
  let mock: IRegistryClient;

  beforeEach(() => {
    mock = new MemoryRegistryClient();
  });

  it('Returns a specific resource', async () => {
    const dxn = 'example:resource';
    const resource = createMockResourceRecord({ dxn: DXN.parse(dxn) });
    mock = new MemoryRegistryClient([resource]);
    // Parse the query DXN separately to ensure it is not the same instance as the resource DXN.
    const registryResource = await mock.getResource(DXN.parse(dxn));
    expect(registryResource).to.be.deep.equal(resource.resource);
    expect(registryResource?.tags.latest).to.not.be.undefined;

    const resourceRecord = await mock.getResourceRecord(DXN.parse(dxn), 'latest');
    expect(resourceRecord?.resource.id.toString()).to.be.deep.equal(resource.resource.id.toString());
    expect(resourceRecord?.tag).to.be.equal('latest');
  });

  it('Returns predefined resources', async () => {
    const resources = await mock.queryResources({});

    expect(resources.length).to.be.equal(30);
  });

  it('Returns predefined types', async () => {
    const types = await mock.getTypeRecords();
    const typeNames = types.map(type => type.messageName).sort();

    expect(typeNames).to.be.deep.equal([
      '.dxos.type.App',
      '.dxos.type.Bot',
      '.dxos.type.File',
      '.dxos.type.IPFS',
      '.dxos.type.KUBE',
      '.dxos.type.Service'
    ]);
  });
});
