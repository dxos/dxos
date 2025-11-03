//
// Copyright 2023 DXOS.org
//

import { afterEach, beforeEach, describe, expect, onTestFinished, test } from 'vitest';

import { Trigger } from '@dxos/async';
import { Context } from '@dxos/context';
import { PublicKey } from '@dxos/keys';
import { type Identity, type IdentityService } from '@dxos/protocols/proto/dxos/client/services';

import { type ServiceContext } from '../services';
import { createServiceContext } from '../testing';

import { IdentityServiceImpl } from './identity-service';

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
      await expect(identityService.createIdentity({})).rejects.toThrowError('Identity already exists');
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
      onTestFinished(() => query.close());
      expect(await result.wait()).to.be.undefined;
    });

    test('updates when identity is created', async () => {
      const query = identityService.queryIdentity();
      let result = new Trigger<Identity | undefined>();
      query.subscribe(({ identity }) => {
        result.wake(identity);
      });
      onTestFinished(() => query.close());
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
    expect(identity.defaultSpaceId).to.be.undefined;
    await identityService.open();
    expect(getDataSpaces()[0].id === identity.defaultSpaceId).to.be.true;
  });

  test('identity without default space credential fixed', async () => {
    const serviceContext = await createServiceContext();
    await serviceContext.open(new Context());
    const identity = await serviceContext.createIdentity();
    const space = await serviceContext.dataSpaceManager!.createDefaultSpace();
    const identityService = createIdentityService(serviceContext);
    expect(identity.defaultSpaceId).to.be.undefined;
    await identityService.open();
    expect(identity.defaultSpaceId === space.id).to.be.true;
  });
});

const createIdentityService = (serviceContext: ServiceContext) =>
  new IdentityServiceImpl(
    serviceContext.identityManager,
    serviceContext.recoveryManager,
    serviceContext.keyring,
    () => serviceContext.dataSpaceManager!,
    (options) => serviceContext.createIdentity(options),
  );
