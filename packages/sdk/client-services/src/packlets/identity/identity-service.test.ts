//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Runtime from 'effect/Runtime';
import { afterEach, beforeEach, describe, expect, onTestFinished, test } from 'vitest';

import { Trigger } from '@dxos/async';
import { Context } from '@dxos/context';
import { PublicKey } from '@dxos/keys';
import { subscribeStream } from '@dxos/protocols';
import { type Identity } from '@dxos/protocols/proto/dxos/client/services';

import { type ServiceContext } from '../services';
import { createServiceContext } from '../testing';
import { IdentityServiceImpl } from './identity-service';

describe('IdentityService', () => {
  let serviceContext: ServiceContext;
  let identityService: IdentityServiceImpl;

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
      const identity = await Effect.runPromise(identityService['IdentityService.createIdentity']({}));

      expect(identity.identityKey).to.be.instanceof(PublicKey);
      expect(identity.spaceKey).to.be.instanceof(PublicKey);
    });

    test('creates a new identity with a display name', async () => {
      const identity = await Effect.runPromise(
        identityService['IdentityService.createIdentity']({ profile: { displayName: 'Example' } }),
      );

      expect(identity.identityKey).to.be.instanceof(PublicKey);
      expect(identity.spaceKey).to.be.instanceof(PublicKey);
      expect(identity.profile?.displayName).to.equal('Example');
    });

    test('fails to create identity if one already exists', async () => {
      await Effect.runPromise(identityService['IdentityService.createIdentity']({}));
      await expect(Effect.runPromise(identityService['IdentityService.createIdentity']({}))).rejects.toThrowError(
        'Identity already exists',
      );
    });

    test('creates identity with no spaces', async () => {
      await Effect.runPromise(identityService['IdentityService.createIdentity']({}));
      const dataSpaces = [...(serviceContext.dataSpaceManager?.spaces?.values() ?? [])];
      expect(dataSpaces.length).to.eq(0);
    });
  });

  describe.skip('recoverIdentity', () => {});

  describe('updateProfile', () => {
    test('updates profile', async () => {
      const identity = await Effect.runPromise(identityService['IdentityService.createIdentity']({}));
      expect(identity.profile?.displayName).to.be.undefined;

      const updatedIdentity = await Effect.runPromise(
        identityService['IdentityService.updateProfile']({ displayName: 'Example' }),
      );
      expect(updatedIdentity.profile?.displayName).to.equal('Example');
    });
  });

  describe('queryIdentity', () => {
    test('returns undefined if no identity is available', async () => {
      const stream = identityService['IdentityService.queryIdentity']();
      const result = new Trigger<Identity | undefined>();
      const cleanup = subscribeStream(Runtime.defaultRuntime, stream, {
        onData: ({ identity }) => result.wake(identity),
      });
      onTestFinished(cleanup);
      expect(await result.wait()).to.be.undefined;
    });

    test('updates when identity is created', async () => {
      const stream = identityService['IdentityService.queryIdentity']();
      let result = new Trigger<Identity | undefined>();
      const cleanup = subscribeStream(Runtime.defaultRuntime, stream, {
        onData: ({ identity }) => result.wake(identity),
      });
      onTestFinished(cleanup);
      expect(await result.wait()).to.be.undefined;

      result = new Trigger<Identity | undefined>();
      const identity = await Effect.runPromise(identityService['IdentityService.createIdentity']({}));
      expect(await result.wait()).to.deep.equal(identity);
    });
  });
});

const createIdentityService = (serviceContext: ServiceContext) => {
  return new IdentityServiceImpl(
    serviceContext.identityManager,
    serviceContext.recoveryManager,
    serviceContext.keyring,
    (options) => serviceContext.createIdentity(options),
  );
};
