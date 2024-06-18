//
// Copyright 2023 DXOS.org
//

import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';

import { Trigger } from '@dxos/async';
import { Context } from '@dxos/context';
import { PublicKey } from '@dxos/keys';
import { type Identity, type IdentityService } from '@dxos/protocols/proto/dxos/client/services';
import { afterEach, afterTest, beforeEach, describe, test } from '@dxos/test';

import { IdentityServiceImpl } from './identity-service';
import { type ServiceContext } from '../services';
import { createServiceContext } from '../testing';

chai.use(chaiAsPromised);

describe('IdentityService', () => {
  let serviceContext: ServiceContext;
  let identityService: IdentityService;

  beforeEach(async () => {
    serviceContext = await createServiceContext();
    await serviceContext.open(new Context());
    identityService = createIdentityService(serviceContext);
  });

  afterEach(async () => {
    await serviceContext.close();
  });

  describe('createIdentity', () => {
    test('creates a new identity', async () => {
      const identity = await identityService.createIdentity({});

      expect(identity.identityKey).to.be.instanceof(PublicKey);
      expect(identity.spaceKey).to.be.instanceof(PublicKey);
    });

    test('creates a new identity with a display name', async () => {
      const identity = await identityService.createIdentity({ profile: { displayName: 'Example' } });

      expect(identity.identityKey).to.be.instanceof(PublicKey);
      expect(identity.spaceKey).to.be.instanceof(PublicKey);
      expect(identity.profile?.displayName).to.equal('Example');
    });

    test('fails to create identity if one already exists', async () => {
      await identityService.createIdentity({});
      await expect(identityService.createIdentity({})).to.be.rejectedWith('Identity already exists');
    });
  });

  describe.skip('recoverIdentity', () => {});

  describe('updateProfile', () => {
    test('updates profile', async () => {
      const identity = await identityService.createIdentity({});
      expect(identity.profile?.displayName).to.be.undefined;

      const updatedIdentity = await identityService.updateProfile({ displayName: 'Example' });
      expect(updatedIdentity.profile?.displayName).to.equal('Example');
    });
  });

  describe('queryIdentity', () => {
    test('returns undefined if no identity is available', async () => {
      const query = identityService.queryIdentity();
      const result = new Trigger<Identity | undefined>();
      query.subscribe(({ identity }) => {
        result.wake(identity);
      });
      afterTest(() => query.close());
      expect(await result.wait()).to.be.undefined;
    });

    test('updates when identity is created', async () => {
      const query = identityService.queryIdentity();
      let result = new Trigger<Identity | undefined>();
      query.subscribe(({ identity }) => {
        result.wake(identity);
      });
      afterTest(() => query.close());
      expect(await result.wait()).to.be.undefined;

      result = new Trigger<Identity | undefined>();
      const identity = await identityService.createIdentity({});
      expect(await result.wait()).to.deep.equal(identity);
    });
  });
});

describe('open', () => {
  test('identity without default space fixed', async () => {
    const serviceContext = await createServiceContext();
    await serviceContext.open(new Context());
    const identity = await serviceContext.createIdentity();
    const identityService = createIdentityService(serviceContext);
    const getDataSpaces = () => [...(serviceContext.dataSpaceManager?.spaces?.values() ?? [])];
    expect(getDataSpaces().length).to.eq(0);
    expect(identity.defaultSpaceKey).to.be.undefined;
    await identityService.open();
    expect(getDataSpaces()[0].key.equals(identity.defaultSpaceKey!)).to.be.true;
  });

  test('identity without default space credential fixed', async () => {
    const serviceContext = await createServiceContext();
    await serviceContext.open(new Context());
    const identity = await serviceContext.createIdentity();
    const space = await serviceContext.dataSpaceManager!.createDefaultSpace();
    const identityService = createIdentityService(serviceContext);
    expect(identity.defaultSpaceKey).to.be.undefined;
    await identityService.open();
    expect(identity.defaultSpaceKey?.equals(space.key)).to.be.true;
  });
});

const createIdentityService = (serviceContext: ServiceContext) => {
  return new IdentityServiceImpl(
    serviceContext.identityManager,
    serviceContext.keyring,
    () => serviceContext.dataSpaceManager!,
    (options) => serviceContext.createIdentity(options),
  );
};
