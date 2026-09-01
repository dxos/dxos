//
// Copyright 2023 DXOS.org
//

import * as EffectContext from 'effect/Context';
import { afterEach, beforeEach, describe, expect, onTestFinished, test } from 'vitest';

import { Trigger } from '@dxos/async';
import { Context } from '@dxos/context';
import { EffectEx } from '@dxos/effect';
import { PublicKey } from '@dxos/keys';
import { subscribeStream } from '@dxos/protocols';
import { type Identity } from '@dxos/protocols/proto/dxos/client/services';
import { IdentityRecovery } from '@dxos/protocols/proto/dxos/halo/credentials';

import { type ServiceContext } from '../services/index.ts';
import { createServiceContext } from '../testing/index.ts';
import { IdentityServiceImpl } from './identity-service.ts';

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
      const identity = await EffectEx.runPromise(identityService['IdentityService.createIdentity']({}));

      expect(identity.identityKey).to.be.instanceof(PublicKey);
      expect(identity.spaceKey).to.be.instanceof(PublicKey);
    });

    test('creates a new identity with a display name', async () => {
      const identity = await EffectEx.runPromise(
        identityService['IdentityService.createIdentity']({ profile: { displayName: 'Example' } }),
      );

      expect(identity.identityKey).to.be.instanceof(PublicKey);
      expect(identity.spaceKey).to.be.instanceof(PublicKey);
      expect(identity.profile?.displayName).to.equal('Example');
    });

    test('fails to create identity if one already exists', async () => {
      await EffectEx.runPromise(identityService['IdentityService.createIdentity']({}));
      await expect(EffectEx.runPromise(identityService['IdentityService.createIdentity']({}))).rejects.toThrowError(
        'Identity already exists',
      );
    });

    test('creates identity with no spaces', async () => {
      await EffectEx.runPromise(identityService['IdentityService.createIdentity']({}));
      const dataSpaces = [...(serviceContext.dataSpaceManager?.spaces?.values() ?? [])];
      expect(dataSpaces.length).to.eq(0);
    });
  });

  describe.skip('recoverIdentity', () => {});

  describe('revokeRecoveryCredential', () => {
    test('records the label and kind on the credential', async () => {
      await EffectEx.runPromise(identityService['IdentityService.createIdentity']({}));
      await createCredential(identityService);

      const [{ assertion }] = serviceContext.recoveryManager.listActiveRecoveryCredentials();
      expect(assertion.label).to.equal('Test passkey');
      expect(assertion.kind).to.equal(IdentityRecovery.Kind.PASSKEY);
    });

    test('revoking removes the credential from the active list', async () => {
      await EffectEx.runPromise(identityService['IdentityService.createIdentity']({}));
      const first = await createCredential(identityService);
      const second = await createCredential(identityService);

      await EffectEx.runPromise(identityService['IdentityService.revokeRecoveryCredential']({ lookupKey: first }));

      const active = serviceContext.recoveryManager.listActiveRecoveryCredentials();
      expect(active).to.have.length(1);
      expect(active[0].assertion.lookupKey?.equals(second)).to.be.true;
    });

    test('refuses to revoke the only remaining credential', async () => {
      await EffectEx.runPromise(identityService['IdentityService.createIdentity']({}));
      const only = await createCredential(identityService);

      await expect(
        EffectEx.runPromise(identityService['IdentityService.revokeRecoveryCredential']({ lookupKey: only })),
      ).rejects.toThrowError('add another one first');
    });

    test('refuses to revoke a credential twice', async () => {
      await EffectEx.runPromise(identityService['IdentityService.createIdentity']({}));
      const first = await createCredential(identityService);
      await createCredential(identityService);

      await EffectEx.runPromise(identityService['IdentityService.revokeRecoveryCredential']({ lookupKey: first }));
      await expect(
        EffectEx.runPromise(identityService['IdentityService.revokeRecoveryCredential']({ lookupKey: first })),
      ).rejects.toThrowError('already revoked');
    });
  });

  describe('updateProfile', () => {
    test('updates profile', async () => {
      const identity = await EffectEx.runPromise(identityService['IdentityService.createIdentity']({}));
      expect(identity.profile?.displayName).to.be.undefined;

      const updatedIdentity = await EffectEx.runPromise(
        identityService['IdentityService.updateProfile']({ displayName: 'Example' }),
      );
      expect(updatedIdentity.profile?.displayName).to.equal('Example');
    });
  });

  describe('queryIdentity', () => {
    test('returns undefined if no identity is available', async () => {
      const stream = identityService['IdentityService.queryIdentity']();
      const result = new Trigger<Identity | undefined>();
      const cleanup = subscribeStream(EffectContext.empty(), stream, {
        onData: ({ identity }) => result.wake(identity),
      });
      onTestFinished(cleanup);
      expect(await result.wait()).to.be.undefined;
    });

    test('updates when identity is created', async () => {
      const stream = identityService['IdentityService.queryIdentity']();
      let result = new Trigger<Identity | undefined>();
      const cleanup = subscribeStream(EffectContext.empty(), stream, {
        onData: ({ identity }) => result.wake(identity),
      });
      onTestFinished(cleanup);
      expect(await result.wait()).to.be.undefined;

      result = new Trigger<Identity | undefined>();
      const identity = await EffectEx.runPromise(identityService['IdentityService.createIdentity']({}));
      expect(await result.wait()).to.deep.equal(identity);
    });
  });
});

/** Registers a passkey-kind recovery credential and returns its lookup key. */
const createCredential = async (identityService: IdentityServiceImpl) => {
  const lookupKey = PublicKey.random();
  await EffectEx.runPromise(
    identityService['IdentityService.createRecoveryCredential']({
      data: {
        recoveryKey: PublicKey.random(),
        lookupKey,
        algorithm: 'ED25519',
        label: 'Test passkey',
        kind: IdentityRecovery.Kind.PASSKEY,
      },
    }),
  );
  return lookupKey;
};

const createIdentityService = (serviceContext: ServiceContext) => {
  return new IdentityServiceImpl(
    serviceContext.identityManager,
    serviceContext.recoveryManager,
    serviceContext.keyring,
    (options) => serviceContext.createIdentity(options),
  );
};
