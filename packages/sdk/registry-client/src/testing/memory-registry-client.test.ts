//
// Copyright 2021 DXOS.org
//

import { expect } from 'chai';
import faker from 'faker';

import { AccountKey, CID, DXN, RegistryClient } from '../api';
import { createDXN, registerMockRecord, registerMockResource, registerMockTypes } from './fake-data-generator';
import { MemoryRegistryClientBackend } from './memory-registry-client';

describe('Registry API mock', function () {
  let mock: MemoryRegistryClientBackend;
  let records: CID[];
  let names: DXN[];

  before(async function () {
    mock = new MemoryRegistryClientBackend();
    const registry = new RegistryClient(mock);
    const owner = AccountKey.random();
    await Promise.all(faker.datatype.array(5).map(() =>
      mock.registerDomainName('example', owner)
    ));

    const types = await registerMockTypes(registry);

    records = await Promise.all(faker.datatype.array(30).map(() =>
      registerMockRecord(registry, {
        typeRecord: faker.random.arrayElement(types)
      })
    ));

    names = records.map(() => createDXN());
    await Promise.all(records.map((record, index) => registerMockResource(
      registry,
      {
        name: names[index],
        record,
        owner
      }
    )));
  });

  it('Returns a specific resource', async function () {
    const name = names[0];
    const resource = await mock.getResource(name);

    expect(resource!.toString()).to.equal(records[0]!.toString());
  });

  it('Returns resources', async function () {
    const resources = await mock.listResources();

    expect(resources.length).to.be.equal(30);
  });

  it('Returns records', async function () {
    const records = await mock.listRecords();

    expect(records.length).to.be.equal(36);
  });
});
