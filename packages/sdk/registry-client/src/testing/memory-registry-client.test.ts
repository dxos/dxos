//
// Copyright 2021 DXOS.org
//

import { expect } from 'chai';
import faker from 'faker';

import { Record as RawRecord } from '../proto';
import { AccountKey, DXN, Resource } from '../types';
import { createMockRecord, createMockResource, createMockTypes } from './fake-data-generator';
import { MemoryRegistryClientBackend } from './memory-registry-client';

describe('Registry API mock', () => {
  let mock: MemoryRegistryClientBackend;
  let types: RawRecord[];
  let records: RawRecord[];
  let resources: Resource[];

  before(async () => {
    mock = new MemoryRegistryClientBackend();
    const owner = AccountKey.random();
    const domains = await Promise.all(faker.datatype.array(5).map(() =>
      mock.registerDomainName(faker.internet.domainWord(), owner)
    ));

    types = createMockTypes();
    const typeCids = await Promise.all(types.map(type => mock.registerRecord(type)));

    records = faker.datatype.array(30).map(() => createMockRecord(faker.random.arrayElement(typeCids)));
    const recordCids = await Promise.all(records.map(record => mock.registerRecord(record)));

    resources = recordCids.map(cid => createMockResource(
      DXN.parse(`${faker.random.arrayElement(domains).name}:${faker.company.bs().replaceAll(' ', '-')}`),
      cid
    ));
    await Promise.all(resources.map(resource => mock.registerResource(resource.name, resource.tags.latest, owner, 'latest')));
  });

  it('Returns a specific resource', async () => {
    const name = resources[0].name;
    // Parse the query DXN separately to ensure it is not the same instance as the resource DXN.
    const resource = await mock.getResource(name);
    expect(resource).to.be.deep.equal(resources[0]);
    expect(resource?.tags.latest).to.not.be.undefined;
  });

  it('Returns resources', async () => {
    const resources = await mock.getResources();

    expect(resources.length).to.be.equal(30);
  });

  it('Returns records', async () => {
    const records = await mock.getRecords();

    expect(records.length).to.be.equal(36);
  });
});
