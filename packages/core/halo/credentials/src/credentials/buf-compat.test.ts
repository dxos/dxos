//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { invariant } from '@dxos/invariant';
import { Keyring } from '@dxos/keyring';
import { PublicKey } from '@dxos/keys';
import { decodeCompat, encodeCompat } from '@dxos/protocols/buf-shape-compat';
import { CredentialSchema, PresentationSchema } from '@dxos/protocols/buf/dxos/halo/credentials_pb';
import { schema } from '@dxos/protocols/proto';
import { type Credential, type Presentation, SpaceMember } from '@dxos/protocols/proto/dxos/halo/credentials';

import { createCredential } from './credential-factory.ts';
import { canonicalStringify, getCredentialProofPayload } from './signing.ts';
import { verifyCredential } from './verifier.ts';

// A credential's signature covers the canonical stringification of the decoded object, so a shape
// drift in the compat layer invalidates every credential ever issued.

const legacyCodec = schema.getCodecForType('dxos.halo.credentials.Credential');
const legacyPresentationCodec = schema.getCodecForType('dxos.halo.credentials.Presentation');

describe('buf shape-compat carries credentials', () => {
  test('a credential signed on protobuf.js still verifies after a buf round-trip', async ({ expect }) => {
    const credential = await createTestCredential();

    const decoded = decodeCompat<Credential>(CredentialSchema, legacyCodec.encode(credential));
    expect(await verifyCredential(decoded)).toEqual({ kind: 'pass' });

    // And the other direction: bytes buf wrote, read back by the legacy codec.
    expect(await verifyCredential(legacyCodec.decode(encodeCompat(CredentialSchema, credential)))).toEqual({
      kind: 'pass',
    });
  });

  test('a Presentation round-trips byte-identically', async ({ expect }) => {
    // `presentCredentialsForChallenge` sends this to EDGE for authentication, so a shape or byte
    // drift is an auth failure rather than a decode error.
    const presentation = { credentials: [await createTestCredential()] };

    const legacyBytes = legacyPresentationCodec.encode(presentation);
    expect(new Uint8Array(encodeCompat(PresentationSchema, presentation))).toEqual(new Uint8Array(legacyBytes));

    // `verifyCredential` deletes an empty `parentCredentialIds` from its input, so compare shapes first.
    const decoded = decodeCompat<Presentation>(PresentationSchema, legacyBytes);
    expect(canonicalStringify(decoded)).toEqual(canonicalStringify(legacyPresentationCodec.decode(legacyBytes)));
    invariant(decoded.credentials);
    expect(await verifyCredential(decoded.credentials[0])).toEqual({ kind: 'pass' });
  });

  test('both codecs produce the same signing payload', async ({ expect }) => {
    const credential = await createTestCredential();
    const legacyBytes = legacyCodec.encode(credential);

    expect(canonicalStringify(decodeCompat<Credential>(CredentialSchema, legacyBytes))).toEqual(
      canonicalStringify(legacyCodec.decode(legacyBytes)),
    );
    expect(getCredentialProofPayload(decodeCompat<Credential>(CredentialSchema, legacyBytes))).toEqual(
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
