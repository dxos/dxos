//
// Copyright 2021 DXOS.org
//

import { ApiPromise } from '@polkadot/api/promise';
import Keyring from '@polkadot/keyring';
import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { join } from 'path';
import protobuf from 'protobufjs';

import { IRegistryApi, CID, RegistryApi } from '../../src';
import { createApiPromise, createKeyring } from '../../src/api-creation';
import { schemaJson } from '../../src/defs/gen';
import { createCID } from '../../src/testing';
import { DEFAULT_DOT_ENDPOINT } from './test-config';

// TODO(marik-d): Use included types proto.
const PATH = join(__dirname, '../../../substrate-node/protobuf-verifier/src/protobuf_examples/dxos.proto');

chai.use(chaiAsPromised);

describe('Registry API', () => {
  let registryApi: IRegistryApi;
  let keypair: ReturnType<Keyring['addFromUri']>;
  let apiPromise: ApiPromise;

  beforeEach(async () => {
    const keyring = await createKeyring();
    const config = { uri: '//Alice' };
    keypair = keyring.addFromUri(config.uri);
    apiPromise = await createApiPromise(DEFAULT_DOT_ENDPOINT);
    registryApi = new RegistryApi(apiPromise, keypair);
  });

  afterEach(async () => {
    await apiPromise.disconnect();
  });

  describe('Types', () => {
    it('Adds type to registry', async () => {
      const root = await protobuf.load(PATH);

      const hash = await registryApi.insertTypeRecord(root, '.dxos.App');

      expect(hash.value.length).to.be.greaterThan(0);
    });

    it('Retrieves a list of types', async () => {
      const types = await registryApi.getTypeRecords();
      expect(types.length).to.be.greaterThan(0);
    });

    it('Retrieves type details', async () => {
      const name = Math.random().toString(36).substring(2);
      const domainKey = await registryApi.registerDomain();

      const root = await protobuf.load(PATH);

      const typeCid = await registryApi.insertTypeRecord(root, '.dxos.App');
      await registryApi.registerResource(domainKey, name, typeCid);

      const type = await registryApi.getTypeRecord(typeCid);
      expect(type?.messageName).to.equal('.dxos.App');
      expect(type?.protobufDefs.lookupType('.dxos.App')).to.not.be.undefined;
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
      appTypeCid = await registryApi.insertTypeRecord(await protobuf.load(PATH), '.dxos.App');

      const contentCid = await registryApi.insertDataRecord({
        appName: 'Tasks App',
        appVersion: 5,
        hasSso: false
      }, appTypeCid);

      const domainKey = await registryApi.registerDomain();
      await registryApi.registerResource(domainKey, appResourceName, contentCid);
    });

    it('Retrieves a list of resources', async () => {
      const resources = await registryApi.getResources();
      expect(resources.length).to.be.greaterThan(0);
    });

    it('Queries by type, when matching, returns matching items', async () => {
      const resources = await registryApi.getResources({ text: appResourceName });
      expect(resources.length).to.be.greaterThan(0);
    });

    it('Queries by type, when not matching, returns empty', async () => {
      const resources = await registryApi.getResources({ text: 'mybot' });
      expect(resources).to.be.empty;
    });
  });

  describe('Data records', () => {
    it('Register a record of your custom type', async () => {
      const appTypeCid = await registryApi.insertTypeRecord(await protobuf.load(PATH), '.dxos.App');

      const appData = {
        appName: 'Tasks App',
        appVersion: 5,
        hasSso: false
      };
      const appCid = await registryApi.insertDataRecord(appData, appTypeCid);

      const appRecord = await registryApi.getDataRecord(appCid);

      expect(appRecord?.data).to.deep.equal({
        '@type': appTypeCid,
        ...appData
      });
    });

    it('Register a record with nested extensions', async () => {
      const proto = protobuf.Root.fromJSON(schemaJson);
      const serviceTypeCid = await registryApi.insertTypeRecord(proto, '.dxos.type.Service');
      const ipfsTypeCid = await registryApi.insertTypeRecord(proto, '.dxos.type.IPFS');

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

    describe('Querying', () => {
      let appTypeCid: CID;
      let botTypeCid: CID;

      beforeEach(async () => {
        appTypeCid = await registryApi.insertTypeRecord(await protobuf.load(PATH), '.dxos.App');
        botTypeCid = await registryApi.insertTypeRecord(await protobuf.load(PATH), '.dxos.Bot');

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
      const root = await protobuf.load(PATH);
      const domainKey = await registryApi.registerDomain();

      const appTypeCid = await registryApi.insertTypeRecord(root, '.dxos.App');

      const name = Math.random().toString(36).substring(2);

      await expect(registryApi.registerResource(domainKey, name, appTypeCid)).to.be.fulfilled;
    });

    it('Does allow to overwrite already registered name', async () => {
      const root = await protobuf.load(PATH);
      const domainKey = await registryApi.registerDomain();

      const appTypeCid = await registryApi.insertTypeRecord(root, '.dxos.App');

      const name = Math.random().toString(36).substring(2);

      await expect(registryApi.registerResource(domainKey, name, appTypeCid)).to.be.fulfilled;

      await expect(registryApi.registerResource(domainKey, name, appTypeCid)).to.be.fulfilled;
    });
  });

  describe('Register domain', () => {
    it('Allows to register a free domain without a vanity name', async () => {
      await expect(registryApi.registerDomain()).to.be.fulfilled;
    });
  });
});
