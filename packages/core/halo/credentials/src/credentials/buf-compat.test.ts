//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Keyring } from '@dxos/keyring';
import { PublicKey } from '@dxos/keys';
import { decodeCompat, encodeCompat } from '@dxos/protocols/buf-shape-compat';
import { CredentialSchema } from '@dxos/protocols/buf/dxos/halo/credentials_pb';
import { schema } from '@dxos/protocols/proto';
import { SpaceMember } from '@dxos/protocols/proto/dxos/halo/credentials';

import { createCredential } from './credential-factory';
import { canonicalStringify, getCredentialProofPayload } from './signing';
import { verifyCredential } from './verifier';

// A credential's signature covers the canonical stringification of the decoded object, so a shape
// drift in the compat layer invalidates every credential ever issued.

const legacyCodec = schema.getCodecForType('dxos.halo.credentials.Credential');

describe('buf shape-compat carries credentials', () => {
  test('a credential signed on protobuf.js still verifies after a buf round-trip', async ({ expect }) => {
    const credential = await createTestCredential();

    const decoded = decodeCompat(CredentialSchema, legacyCodec.encode(credential));
    expect(await verifyCredential(decoded)).toEqual({ kind: 'pass' });

    // And the other direction: bytes buf wrote, read back by the legacy codec.
    expect(await verifyCredential(legacyCodec.decode(encodeCompat(CredentialSchema, credential)))).toEqual({
      kind: 'pass',
    });
  });

  test('both codecs produce the same signing payload', async ({ expect }) => {
    const credential = await createTestCredential();
    const legacyBytes = legacyCodec.encode(credential);

    expect(canonicalStringify(decodeCompat(CredentialSchema, legacyBytes))).toEqual(
      canonicalStringify(legacyCodec.decode(legacyBytes)),
    );
    expect(getCredentialProofPayload(decodeCompat(CredentialSchema, legacyBytes))).toEqual(
      getCredentialProofPayload(legacyCodec.decode(legacyBytes)),
    );
  });
});

const createTestCredential = async () => {
  const keyring = new Keyring();
  const issuer = await keyring.createKey();
  return createCredential({
    assertion: {
      '@type': 'dxos.halo.credentials.SpaceMember',
      'spaceKey': PublicKey.random(),
      'role': SpaceMember.Role.ADMIN,
      'genesisFeedKey': PublicKey.random(),
    },
    issuer,
    signer: keyring,
    subject: PublicKey.random(),
  });
};
