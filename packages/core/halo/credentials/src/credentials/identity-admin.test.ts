//
// Copyright 2026 DXOS.org
//

import { clone, create, fromBinary, toBinary } from '@bufbuild/protobuf';
import { describe, test } from 'vitest';

import { invariant } from '@dxos/invariant';
import { Keyring } from '@dxos/keyring';
import { PublicKey } from '@dxos/keys';
import { fromPublicKey } from '@dxos/protocols/buf';
import { CredentialSchema, IdentityAdminSchema } from '@dxos/protocols/buf/dxos/halo/credentials_pb';

import { getCredentialAssertion } from './assertions.ts';
import { createCredentialSignerWithKey } from './credential-factory.ts';
import { createIdentityAdminCredential, verifyIdentityAdmin } from './identity-admin.ts';

const setup = async () => {
  const keyring = new Keyring();
  const agent = await keyring.createKey();
  return { keyring, agent, signer: createCredentialSignerWithKey(keyring, agent) };
};

describe('identity admin', () => {
  test('an identity makes another identity its admin, and the grant survives the wire', async ({ expect }) => {
    const { agent, signer } = await setup();
    const alice = PublicKey.random();
    const credential = await createIdentityAdminCredential(signer, alice);

    const received = fromBinary(CredentialSchema, toBinary(CredentialSchema, credential));
    expect(getCredentialAssertion(received).$typeName).toBe('dxos.halo.credentials.IdentityAdmin');
    const result = await verifyIdentityAdmin(received, agent);
    expect(result.kind).toBe('pass');
    if (result.kind === 'pass') {
      expect(result.admin.identityKey.equals(agent)).toBe(true);
      expect(result.admin.adminKey.equals(alice)).toBe(true);
    }
  });

  test('a grant another identity signed does not name an admin of the identity', async ({ expect }) => {
    const { keyring, agent } = await setup();
    const other = await keyring.createKey();
    const credential = await createIdentityAdminCredential(
      createCredentialSignerWithKey(keyring, other),
      PublicKey.random(),
    );

    expect(await verifyIdentityAdmin(credential, agent)).toMatchObject({ kind: 'fail', reason: 'wrong-identity' });
  });

  test('a grant changed after signing fails its signature', async ({ expect }) => {
    const { agent, signer } = await setup();
    const signed = await createIdentityAdminCredential(signer, PublicKey.random());
    const other = await createIdentityAdminCredential(signer, PublicKey.random());
    const forged = clone(CredentialSchema, signed);
    forged.subject = other.subject;

    expect(await verifyIdentityAdmin(forged, agent)).toMatchObject({ kind: 'fail', reason: 'invalid-signature' });
  });

  test('an assertion that does not decode, or names an admin other than the subject, is malformed', async ({
    expect,
  }) => {
    const { agent, signer } = await setup();
    const truncated = clone(CredentialSchema, await createIdentityAdminCredential(signer, PublicKey.random()));
    const packed = truncated.subject?.assertion;
    invariant(packed);
    packed.value = packed.value.subarray(0, packed.value.length - 1);
    expect(await verifyIdentityAdmin(truncated, agent)).toMatchObject({ kind: 'fail', reason: 'malformed' });

    const mismatched = await signer.createCredential({
      subject: PublicKey.random(),
      assertion: create(IdentityAdminSchema, {
        identityKey: fromPublicKey(agent),
        adminKey: fromPublicKey(PublicKey.random()),
      }),
    });
    expect(await verifyIdentityAdmin(mismatched, agent)).toMatchObject({ kind: 'fail', reason: 'malformed' });
  });
});
