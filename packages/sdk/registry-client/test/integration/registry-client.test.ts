//
// Copyright 2021 DXOS.org
//

import { ApiPromise } from '@polkadot/api/promise';
import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import protobuf from 'protobufjs';

import { AccountKey, App, CID, createCID, DomainKey, DXN, RegistryClient, schemaJson } from '../../src';
import { setup } from './utils';

chai.use(chaiAsPromised);

const protoSchema = protobuf.Root.fromJSON(schemaJson);

const randomName = () => {
  // Must start with a letter.
  return `r${Math.random().toString(36).substring(2)}`;
};

describe('Registry Client', () => {
  let registryClient: RegistryClient;
  let apiPromise: ApiPromise;
  let account: AccountKey;

  beforeEach(async () => {
    const setupResult = await setup();
    apiPromise = setupResult.apiPromise;
    registryClient = setupResult.registryClient;
    account = await setupResult.accountsClient.createAccount();
  });

  afterEach(async () => {
    await apiPromise.disconnect();
  });

  describe('Types', () => {
    it('Adds type to registry', async () => {
      const hash = await registryClient.registerTypeRecord('.dxos.type.App', protoSchema);

      expect(hash.value.length).to.be.greaterThan(0);
    });

    it('Retrieves a list of types', async () => {
      const types = await registryClient.getTypeRecords();
      expect(types.length).to.be.greaterThan(0);
    });

    it('Retrieves type details', async () => {
      const domainKey = await registryClient.registerDomainKey(account);

      const typeCid = await registryClient.registerTypeRecord('.dxos.type.App', protoSchema);
      await registryClient.registerResource(DXN.fromDomainKey(domainKey, randomName()), 'latest', typeCid, account);

      const typeRecord = await registryClient.getTypeRecord(typeCid);
      expect(typeRecord?.type?.messageName).to.equal('.dxos.type.App');
      expect(typeRecord?.type?.protobufDefs.lookupType('.dxos.type.App')).to.not.be.undefined;
    });
  });

  describe('Domains', () => {
    it('Retrieves a list of domains', async () => {
      const domains = await registryClient.getDomains();
      expect(domains.length).to.be.greaterThan(0);
    });
  });

  describe('Resources', () => {
    let appTypeCid: CID;
    let contentCid: CID;
    const appResourceName = 'app';
    let domainKey: DomainKey;

    beforeEach(async () => {
      appTypeCid = await registryClient.registerTypeRecord('.dxos.type.App', protoSchema);

      contentCid = await registryClient.registerRecord({
        appName: 'Tasks App',
        appVersion: 5,
        hasSso: false
      }, appTypeCid);

      domainKey = await registryClient.registerDomainKey(account);
      await registryClient.registerResource(DXN.fromDomainKey(domainKey, appResourceName), 'latest', contentCid, account);
    });

    it('Retrieves a list of resources', async () => {
      const resources = await registryClient.getResources();
      expect(resources.length).to.be.greaterThan(0);
    });

    it('Queries by type, when matching, returns matching items', async () => {
      const resources = await registryClient.getResources({ text: appResourceName });
      expect(resources.length).to.be.greaterThan(0);
    });

    it('Queries by type, when not matching, returns empty', async () => {
      const resources = await registryClient.getResources({ text: 'mybot' });
      expect(resources).to.be.empty;
    });

    it('Retrieves a single resource', async () => {
      const id = DXN.fromDomainKey(domainKey, appResourceName);
      const resource = await registryClient.getResource(id);
      expect(resource).to.not.be.undefined;
      expect(resource!.name.toString()).to.be.equal(id.toString());
      expect(Object.keys(resource!.tags).length).to.equal(1);
      expect(resource!.tags.latest?.toString()).to.be.equal(contentCid.toString());
    });

    it('Deletes a single resource', async () => {
      const name = DXN.fromDomainKey(domainKey, appResourceName);
      await registryClient.registerResource(name, 'latest', undefined, account);
      const resource = await registryClient.getResource(name);
      expect(resource).to.be.undefined;
    });

    describe('Tags and versions', () => {
      const versionedName = 'versionedApp';
      let version2: CID;
      let version3: CID;
      let version4: CID;
      let versionedDxn: DXN;

      beforeEach(async () => {
        version2 = await registryClient.registerRecord({
          appName: 'Versioned App',
          appVersion: 2,
          hasSso: false
        }, appTypeCid);
        version3 = await registryClient.registerRecord({
          appName: 'Versioned App',
          appVersion: 3,
          hasSso: false
        }, appTypeCid);
        version4 = await registryClient.registerRecord({
          appName: 'Versioned App',
          appVersion: 4,
          hasSso: false
        }, appTypeCid);

        versionedDxn = DXN.fromDomainKey(domainKey, versionedName);
        await registryClient.registerResource(versionedDxn, 'latest', version4, account);
        await registryClient.registerResource(versionedDxn, 'beta', version2, account);
        await registryClient.registerResource(versionedDxn, 'alpha', version3, account);
      });

      it('Properly Registers resource with tags and versions', async () => {
        const resource = await registryClient.getResource(versionedDxn);
        expect(resource).to.not.be.undefined;

        expect(resource!.tags.latest?.toString()).to.be.equal(version4.toString());
        expect(resource!.tags.alpha?.toString()).to.be.equal(version3.toString());
        expect(resource!.tags.beta?.toString()).to.be.equal(version2.toString());
      });

      it('queries by tag', async () => {
        const resource = await registryClient.getResourceRecord(versionedDxn, 'alpha');
        expect(resource).to.not.be.undefined;
        expect(resource!.tag).to.be.equal('alpha');
      });
    });
  });

  describe('Data records', () => {
    it('Register a record of your custom type', async () => {
      const appTypeCid = await registryClient.registerTypeRecord('.dxos.type.App', protoSchema);

      const appData: App = {
        repos: [],
        web: {
          entryPoint: './path/to/main.js'
        }
      };
      const appCid = await registryClient.registerRecord(appData, appTypeCid);

      const appRecord = await registryClient.getRecord(appCid);
      expect(appRecord?.payload).to.deep.equal({
        '@type': appTypeCid,
        ...appData
      });
    });

    it('Register a record with nested extensions', async () => {
      const serviceTypeCid = await registryClient.registerTypeRecord('.dxos.type.Service', protoSchema);
      const ipfsTypeCid = await registryClient.registerTypeRecord('.dxos.type.IPFS', protoSchema);

      const serviceData = {
        type: 'ipfs',
        kube: createCID().value,
        extension: {
          '@type': ipfsTypeCid,
          'protocol': 'ipfs/0.1.0',
          'addresses': [
            '/ip4/123.123.123.123/tcp/5566'
          ]
        }
      };
      const recordCid = await registryClient.registerRecord(serviceData, serviceTypeCid);

      const appRecord = await registryClient.getRecord(recordCid);
      expect(appRecord?.payload).to.deep.equal({
        '@type': serviceTypeCid,
        ...serviceData
      });
    });

    // TODO(wittjosiah): Reimplement.

    // it('invalid records are ignored by list methods', async () => {
    //   const cid = await registryClient.insertRawRecord(Buffer.from('100203', 'hex'));

    //   const records = await registryClient.getRecords();
    //   expect(records.every(record => !record.cid.equals(cid))).to.be.true;

    //   const resources = await registryClient.queryResources();
    //   expect(resources.every(resource => {
    //     const tags = Object.values(resource.tags).map(tag => tag?.toString() ?? '');
    //     const versions = Object.values(resource.versions).map(version => version?.toString() ?? '');
    //     return !tags.includes(cid.toString()) && !versions.includes(cid.toString());
    //   })).to.be.true;
    // });

    it('Records has date fields decoded properly', async () => {
      for (const record of await registryClient.getRecords()) {
        expect(record.created?.toString()).to.not.equal('Invalid Date');
      }
    });

    describe('Querying', () => {
      let appTypeCid: CID;
      let botTypeCid: CID;

      beforeEach(async () => {
        appTypeCid = await registryClient.registerTypeRecord('.dxos.type.App', protoSchema);
        botTypeCid = await registryClient.registerTypeRecord('.dxos.type.Bot', protoSchema);

        const appCid = await registryClient.registerRecord({
          appName: 'Tasks App',
          appVersion: 5,
          hasSso: false
        }, appTypeCid);
        await registryClient.getRecord(appCid);
      });

      it('Queries records by type, when matching, returns matching items', async () => {
        const records = await registryClient.getRecords({ type: appTypeCid });
        expect(records.length).to.be.equal(1);
      });

      it('Queries records by type, when not matching, returns empty', async () => {
        const resources = await registryClient.getRecords({ type: botTypeCid });
        expect(resources).to.be.empty;
      });
    });
  });

  describe('Register name', () => {
    it('Assigns a name to a type', async () => {
      const domainKey = await registryClient.registerDomainKey(account);

      const appTypeCid = await registryClient.registerTypeRecord('.dxos.App', protoSchema);

      await expect(
        registryClient.registerResource(DXN.fromDomainKey(domainKey, randomName()), 'latest', appTypeCid, account)
      ).to.be.fulfilled;
    });

    it('Does allow to overwrite already registered name', async () => {
      const domainKey = await registryClient.registerDomainKey(account);

      const appTypeCid = await registryClient.registerTypeRecord('.dxos.type.App', protoSchema);

      await expect(
        registryClient.registerResource(DXN.fromDomainKey(domainKey, randomName()), 'latest', appTypeCid, account)
      ).to.be.fulfilled;

      await expect(
        registryClient.registerResource(DXN.fromDomainKey(domainKey, randomName()), 'latest', appTypeCid, account)
      ).to.be.fulfilled;
    });
  });

  describe('Register domain', () => {
    it('Allows to register a free domain without a vanity name', async () => {
      await expect(registryClient.registerDomainKey(account)).to.be.fulfilled;
    });
  });
});
