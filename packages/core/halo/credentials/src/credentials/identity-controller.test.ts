//
// Copyright 2026 DXOS.org
//

import { clone, create, fromBinary, toBinary } from '@bufbuild/protobuf';
import { describe, test } from 'vitest';

import { invariant } from '@dxos/invariant';
import { Keyring } from '@dxos/keyring';
import { PublicKey } from '@dxos/keys';
import { fromPublicKey } from '@dxos/protocols/buf';
import { CredentialSchema, IdentityControllerSchema } from '@dxos/protocols/buf/dxos/halo/credentials_pb';

import { getCredentialAssertion } from './assertions.ts';
import { createCredentialSignerWithKey } from './credential-factory.ts';
import { createIdentityControllerCredential, verifyIdentityController } from './identity-controller.ts';

const setup = async () => {
  const keyring = new Keyring();
  const agent = await keyring.createKey();
  return { keyring, agent, signer: createCredentialSignerWithKey(keyring, agent) };
};

describe('identity controller', () => {
  test('an identity grants a controller control of itself, and the grant survives the wire', async ({ expect }) => {
    const { agent, signer } = await setup();
    const alice = PublicKey.random();
    const credential = await createIdentityControllerCredential(signer, alice);

    const received = fromBinary(CredentialSchema, toBinary(CredentialSchema, credential));
    expect(getCredentialAssertion(received).$typeName).toBe('dxos.halo.credentials.IdentityController');
    const result = await verifyIdentityController(received, agent);
    expect(result.kind).toBe('pass');
    if (result.kind === 'pass') {
      expect(result.controller.identityKey.equals(agent)).toBe(true);
      expect(result.controller.controllerKey.equals(alice)).toBe(true);
    }
  });

  test('a grant another identity signed does not name a controller of the identity', async ({ expect }) => {
    const { keyring, agent } = await setup();
    const other = await keyring.createKey();
    const credential = await createIdentityControllerCredential(
      createCredentialSignerWithKey(keyring, other),
      PublicKey.random(),
    );

    expect(await verifyIdentityController(credential, agent)).toMatchObject({ kind: 'fail', reason: 'wrong-identity' });
  });

  test('a grant changed after signing fails its signature', async ({ expect }) => {
    const { agent, signer } = await setup();
    const signed = await createIdentityControllerCredential(signer, PublicKey.random());
    const other = await createIdentityControllerCredential(signer, PublicKey.random());
    const forged = clone(CredentialSchema, signed);
    forged.subject = other.subject;

    expect(await verifyIdentityController(forged, agent)).toMatchObject({ kind: 'fail', reason: 'invalid-signature' });
  });

  test('an assertion that does not decode, or names a controller other than the subject, is malformed', async ({
    expect,
  }) => {
    const { agent, signer } = await setup();
    const truncated = clone(CredentialSchema, await createIdentityControllerCredential(signer, PublicKey.random()));
    const packed = truncated.subject?.assertion;
    invariant(packed);
    packed.value = packed.value.subarray(0, packed.value.length - 1);
    expect(await verifyIdentityController(truncated, agent)).toMatchObject({ kind: 'fail', reason: 'malformed' });

    const mismatched = await signer.createCredential({
      subject: PublicKey.random(),
      assertion: create(IdentityControllerSchema, {
        identityKey: fromPublicKey(agent),
        controllerKey: fromPublicKey(PublicKey.random()),
      }),
    });
    expect(await verifyIdentityController(mismatched, agent)).toMatchObject({ kind: 'fail', reason: 'malformed' });
  });
});
