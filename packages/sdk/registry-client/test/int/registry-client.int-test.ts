//
// Copyright 2021 DXOS.org
//

import { ApiPromise } from '@polkadot/api/promise';
import Keyring from '@polkadot/keyring';
import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import protobuf from 'protobufjs';

import { IRegistryClient, CID, RegistryClient } from '../../src';
import { createApiPromise, createKeyring } from '../../src/api-creation';
import { DomainKey, DXN } from '../../src/models';
import { schemaJson } from '../../src/proto/gen';
import { App } from '../../src/proto/gen/dxos/type';
import { createCID } from '../../src/testing';
import { DEFAULT_DOT_ENDPOINT } from './test-config';

chai.use(chaiAsPromised);

const protoSchema = protobuf.Root.fromJSON(schemaJson);

describe('Registry Client', () => {
  let registryApi: IRegistryClient;
  let keypair: ReturnType<Keyring['addFromUri']>;
  let apiPromise: ApiPromise;

  beforeEach(async () => {
    const keyring = await createKeyring();
    const config = { uri: '//Alice' };
    keypair = keyring.addFromUri(config.uri);
    apiPromise = await createApiPromise(DEFAULT_DOT_ENDPOINT);
    registryApi = new RegistryClient(apiPromise, keypair);
  });

  afterEach(async () => {
    await apiPromise.disconnect();
  });

  describe('Types', () => {
    it('Adds type to registry', async () => {
      const hash = await registryApi.insertTypeRecord(protoSchema, '.dxos.type.App');

      expect(hash.value.length).to.be.greaterThan(0);
    });

    it('Retrieves a list of types', async () => {
      const types = await registryApi.getTypeRecords();
      expect(types.length).to.be.greaterThan(0);
    });

    it('Retrieves type details', async () => {
      const name = Math.random().toString(36).substring(2);
      const domainKey = await registryApi.registerDomain();

      const typeCid = await registryApi.insertTypeRecord(protoSchema, '.dxos.type.App');
      await registryApi.updateResource(DXN.fromDomainKey(domainKey, name), typeCid);

      const type = await registryApi.getTypeRecord(typeCid);
      expect(type?.messageName).to.equal('.dxos.type.App');
      expect(type?.protobufDefs.lookupType('.dxos.type.App')).to.not.be.undefined;
    });
  });

  describe('Domains', () => {
    it('Retrieves a list of domains', async () => {
      const domains = await registryApi.getDomains();
      expect(domains.length).to.be.greaterThan(0);
    });
  });

  describe('Resources', () => {
    let appTypeCid: CID;
    let contentCid: CID;
    const appResourceName = 'app';
    let domainKey: DomainKey;

    beforeEach(async () => {
      appTypeCid = await registryApi.insertTypeRecord(protoSchema, '.dxos.type.App');

      contentCid = await registryApi.insertDataRecord({
        appName: 'Tasks App',
        appVersion: 5,
        hasSso: false
      }, appTypeCid);

      domainKey = await registryApi.registerDomain();
      await registryApi.updateResource(DXN.fromDomainKey(domainKey, appResourceName), contentCid);
    });

    it('Retrieves a list of resources', async () => {
      const resources = await registryApi.queryResources();
      expect(resources.length).to.be.greaterThan(0);
    });

    it('Queries by type, when matching, returns matching items', async () => {
      const resources = await registryApi.queryResources({ text: appResourceName });
      expect(resources.length).to.be.greaterThan(0);
    });

    it('Queries by type, when not matching, returns empty', async () => {
      const resources = await registryApi.queryResources({ text: 'mybot' });
      expect(resources).to.be.empty;
    });

    it('Retrieves a single resource', async () => {
      const id = DXN.fromDomainKey(domainKey, appResourceName);
      const resource = await registryApi.getResource(id);
      expect(resource).to.not.be.undefined;
      expect(resource!.id.toString()).to.be.equal(id.toString());
      expect(Object.keys(resource!.versions).length).to.equal(0);
      expect(Object.keys(resource!.tags).length).to.equal(1);
      expect(resource!.tags.latest?.toString()).to.be.equal(contentCid.toString());
    });

    describe('Tags and versions', () => {
      const versionedName = 'versionedApp';
      let version2: CID;
      let version3: CID;
      let version4: CID;
      let versionedDxn: DXN;

      beforeEach(async () => {
        version2 = await registryApi.insertDataRecord({
          appName: 'Versioned App',
          appVersion: 2,
          hasSso: false
        }, appTypeCid);
        version3 = await registryApi.insertDataRecord({
          appName: 'Versioned App',
          appVersion: 3,
          hasSso: false
        }, appTypeCid);
        version4 = await registryApi.insertDataRecord({
          appName: 'Versioned App',
          appVersion: 4,
          hasSso: false
        }, appTypeCid);

        versionedDxn = DXN.fromDomainKey(domainKey, versionedName);
        await registryApi.updateResource(versionedDxn, version2, { tags: ['beta'], version: '2.0.0' });
        await registryApi.updateResource(versionedDxn, version3, { tags: ['alpha'], version: '3.0.0' });
        await registryApi.updateResource(versionedDxn, version4); // latest tag by default.
      });

      it('Properly Registers resource with tags and versions', async () => {
        const resource = await registryApi.getResource(versionedDxn);
        expect(resource).to.not.be.undefined;

        expect(resource!.tags.latest?.toString()).to.be.equal(version4.toString());
        expect(resource!.tags.alpha?.toString()).to.be.equal(version3.toString());
        expect(resource!.tags.beta?.toString()).to.be.equal(version2.toString());

        expect(resource!.versions['2.0.0']?.toString()).to.be.equal(version2.toString());
        expect(resource!.versions['3.0.0']?.toString()).to.be.equal(version3.toString());
      });

      it('queries by tag', async () => {
        const resource = await registryApi.getResourceRecord(versionedDxn, 'alpha');
        expect(resource).to.not.be.undefined;

        expect(resource!.record.cid.toString()).to.be.equal(version3.toString());

        expect(resource!.tag).to.be.equal('alpha');
        expect(resource!.version).to.be.undefined;
      });

      it('queries by version', async () => {
        const resource = await registryApi.getResourceRecord(versionedDxn, '3.0.0');
        expect(resource).to.not.be.undefined;

        expect(resource!.record.cid.toString()).to.be.equal(version3.toString());
        expect(resource!.tag).to.be.undefined;
        expect(resource!.version).to.be.equal('3.0.0');
      });
    });
  });

  describe('Data records', () => {
    it('Register a record of your custom type', async () => {
      const appTypeCid = await registryApi.insertTypeRecord(protoSchema, '.dxos.type.App');

      const appData: App = {
        displayName: 'Tasks App',
        keywords: ['tasks', 'productivity'],
        contentType: ['braneframe:type.tasks.task']
      };
      const appCid = await registryApi.insertDataRecord(appData, appTypeCid);

      const appRecord = await registryApi.getDataRecord(appCid);

      expect(appRecord?.data).to.deep.equal({
        '@type': appTypeCid,
        ...appData
      });
    });

    it('Register a record with nested extensions', async () => {
      const serviceTypeCid = await registryApi.insertTypeRecord(protoSchema, '.dxos.type.Service');
      const ipfsTypeCid = await registryApi.insertTypeRecord(protoSchema, '.dxos.type.IPFS');

      const serviceData = {
        type: 'ipfs',
        kube: createCID().value,
        extension: {
          '@type': ipfsTypeCid,
          protocol: 'ipfs/0.1.0',
          addresses: [
            '/ip4/123.123.123.123/tcp/5566'
          ]
        }
      };
      const recordCid = await registryApi.insertDataRecord(serviceData, serviceTypeCid);

      const appRecord = await registryApi.getDataRecord(recordCid);
      expect(appRecord?.data).to.deep.equal({
        '@type': serviceTypeCid,
        ...serviceData
      });
    });

    it('invalid records are ignored by list methods', async () => {
      const cid = await registryApi.insertRawRecord(Buffer.from('100203', 'hex'));

      const records = await registryApi.getRecords();
      expect(records.every(record => !record.cid.equals(cid))).to.be.true;

      const resources = await registryApi.queryResources();
      expect(resources.every(resource => {
        const tags = Object.values(resource.tags).map(tag => tag?.toString() ?? '');
        const versions = Object.values(resource.versions).map(version => version?.toString() ?? '');
        return !tags.includes(cid.toString()) && !versions.includes(cid.toString());
      })).to.be.true;
    });

    it('Records has date fields decoded properly', async () => {
      for (const record of await registryApi.getRecords()) {
        expect(record.meta.created?.toString()).to.not.equal('Invalid Date');
      }
    });

    describe('Querying', () => {
      let appTypeCid: CID;
      let botTypeCid: CID;

      beforeEach(async () => {
        appTypeCid = await registryApi.insertTypeRecord(protoSchema, '.dxos.type.App');
        botTypeCid = await registryApi.insertTypeRecord(protoSchema, '.dxos.type.Bot');

        const appCid = await registryApi.insertDataRecord({
          appName: 'Tasks App',
          appVersion: 5,
          hasSso: false
        }, appTypeCid);
        await registryApi.getDataRecord(appCid);
      });

      it('Queries records by type, when matching, returns matching items', async () => {
        const records = await registryApi.getRecords({ type: appTypeCid });
        expect(records.length).to.be.equal(1);
      });

      it('Queries records by type, when not matching, returns empty', async () => {
        const resources = await registryApi.getRecords({ type: botTypeCid });
        expect(resources).to.be.empty;
      });
    });
  });

  describe('Register name', () => {
    it('Assigns a name to a type', async () => {
      const domainKey = await registryApi.registerDomain();

      const appTypeCid = await registryApi.insertTypeRecord(protoSchema, '.dxos.App');

      const name = Math.random().toString(36).substring(2);

      await expect(registryApi.updateResource(DXN.fromDomainKey(domainKey, name), appTypeCid)).to.be.fulfilled;
    });

    it('Does allow to overwrite already registered name', async () => {
      const domainKey = await registryApi.registerDomain();

      const appTypeCid = await registryApi.insertTypeRecord(protoSchema, '.dxos.type.App');

      const name = Math.random().toString(36).substring(2);

      await expect(registryApi.updateResource(DXN.fromDomainKey(domainKey, name), appTypeCid)).to.be.fulfilled;

      await expect(registryApi.updateResource(DXN.fromDomainKey(domainKey, name), appTypeCid)).to.be.fulfilled;
    });
  });

  describe('Register domain', () => {
    it('Allows to register a free domain without a vanity name', async () => {
      await expect(registryApi.registerDomain()).to.be.fulfilled;
    });
  });
});
