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
      await registryApi.updateResource(domainKey, name, typeCid);

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
    const appResourceName = 'app';

    beforeEach(async () => {
      appTypeCid = await registryApi.insertTypeRecord(protoSchema, '.dxos.type.App');

      const contentCid = await registryApi.insertDataRecord({
        appName: 'Tasks App',
        appVersion: 5,
        hasSso: false
      }, appTypeCid);

      const domainKey = await registryApi.registerDomain();
      await registryApi.updateResource(domainKey, appResourceName, contentCid);
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

      await expect(registryApi.updateResource(domainKey, name, appTypeCid)).to.be.fulfilled;
    });

    it('Does allow to overwrite already registered name', async () => {
      const domainKey = await registryApi.registerDomain();

      const appTypeCid = await registryApi.insertTypeRecord(protoSchema, '.dxos.type.App');

      const name = Math.random().toString(36).substring(2);

      await expect(registryApi.updateResource(domainKey, name, appTypeCid)).to.be.fulfilled;

      await expect(registryApi.updateResource(domainKey, name, appTypeCid)).to.be.fulfilled;
    });
  });

  describe('Register domain', () => {
    it('Allows to register a free domain without a vanity name', async () => {
      await expect(registryApi.registerDomain()).to.be.fulfilled;
    });
  });
});
