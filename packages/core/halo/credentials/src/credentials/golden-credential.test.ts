//
// Copyright 2026 DXOS.org
//

import { create, fromBinary, toBinary } from '@bufbuild/protobuf';
import { describe, expect, test } from 'vitest';

import { Keyring } from '@dxos/keyring';
import { PublicKey } from '@dxos/keys';
import { fromPublicKey, toPublicKey } from '@dxos/protocols/buf';
import {
  AuthorizedDeviceSchema,
  type Credential,
  CredentialSchema,
} from '@dxos/protocols/buf/dxos/halo/credentials_pb';

import { getCredentialAssertion } from './assertions.ts';
import { createCredential } from './credential-factory.ts';
import { issuerOf } from './credential-keys.ts';
import { getCredentialProofPayload } from './signing.ts';
import { GOLDEN_CREDENTIAL_BYTES_B64, GOLDEN_CREDENTIAL_PROOF_PAYLOAD } from './testing/golden-credential.ts';
import { verifyCredential } from './verifier.ts';

// The guard a self-consistency test cannot be: a test that signs a credential with the current tree
// moves with the tree, so a shape change keeps agreeing with itself. These bytes were signed by a
// build that predates the move to buf, so only they can catch a signing payload that has changed.

const golden = Buffer.from(GOLDEN_CREDENTIAL_BYTES_B64, 'base64');

describe('a credential signed by an earlier build', () => {
  test('still verifies', async () => {
    expect(await verifyCredential(fromBinary(CredentialSchema, golden))).toEqual({ kind: 'pass' });
  });

  test('and its signing payload is reproduced byte for byte', () => {
    // The payload is the whole signature format: a field that moves, gains a default, or serialises
    // differently shows up here as a diff rather than as an unverifiable credential in the field.
    expect(Buffer.from(getCredentialProofPayload(fromBinary(CredentialSchema, golden))).toString('utf8')).toEqual(
      GOLDEN_CREDENTIAL_PROOF_PAYLOAD,
    );
  });

  test('and re-encoding it is byte-identical', () => {
    // Nothing re-signs a stored credential, so a peer that re-encodes one must produce the same bytes
    // or its id (a hash of them) changes and the credentials document keys it under the wrong entry.
    expect(new Uint8Array(toBinary(CredentialSchema, fromBinary(CredentialSchema, golden)))).toEqual(
      new Uint8Array(golden),
    );
  });

  test('and reads as the credential it was', () => {
    const credential = fromBinary(CredentialSchema, golden);
    expect(issuerOf(credential).toHex()).toEqual(
      '0464711708be3a760aeb81a4832002d9f4dbed73af1017f3b9cc4d095f31d9d60a923b61c6f7a36e8fd9be512c783265d8ad97e7a0f4119b5c2bbad91e22d40f14',
    );
    expect(getCredentialAssertion(credential).$typeName).toEqual('dxos.halo.credentials.AuthorizedDevice');
  });
});

describe('a credential signed by this build', () => {
  test('flattens its assertion into the signing payload rather than leaving it packed', async () => {
    // `anyPack` writes a `type.googleapis.com/` prefix while the registry is keyed by the bare
    // name, so a lookup on the raw `type_url` silently leaves every assertion packed — signing an
    // opaque blob whose shape no future change can be checked against.
    const keyring = new Keyring();
    const issuer = await keyring.createKey();
    const deviceKey = PublicKey.random();
    const credential = await createCredential({
      assertion: create(AuthorizedDeviceSchema, {
        identityKey: fromPublicKey(issuer),
        deviceKey: fromPublicKey(deviceKey),
      }),
      issuer,
      signer: keyring,
      subject: deviceKey,
    });

    // `canonicalStringify` drops `@type`, so the flattened keys are what the signature covers.
    const payload = JSON.parse(Buffer.from(getCredentialProofPayload(credential)).toString('utf8'));
    expect(payload.subject.assertion).toEqual({
      deviceKey: deviceKey.toHex(),
      identityKey: issuer.toHex(),
    });
  });
});

describe('the assertion type_url a credential carries', () => {
  test('is the bare type name, which is what EDGE resolves', async ({ expect }) => {
    // EDGE keys its assertion registry by bare `typeName`; `anyPack`'s `type.googleapis.com/`
    // prefix misses that lookup and fails the websocket upgrade with a 500.
    const { credential } = await makeCredential();
    expect(credential.subject?.assertion?.typeUrl).toEqual('dxos.halo.credentials.AuthorizedDevice');
  });

  test('does not reach the signature or the id, which cover the prefixed form identically', async ({ expect }) => {
    // Both are digests of the signing payload, and `canonicalStringify` drops `@type` — so the url
    // form is outside what is signed, and switching it cannot invalidate an issued credential.
    const { credential } = await makeCredential();
    const prefixed = withPrefixedAssertionUrl(credential);

    expect(Buffer.from(getCredentialProofPayload(prefixed))).toEqual(
      Buffer.from(getCredentialProofPayload(credential)),
    );
    expect(await verifyCredential(prefixed)).toEqual({ kind: 'pass' });
  });

  test('still resolves through buf, which normalizes either form', async ({ expect }) => {
    const { deviceKey, credential } = await makeCredential();
    for (const candidate of [credential, withPrefixedAssertionUrl(credential)]) {
      const assertion = getCredentialAssertion(candidate);
      expect(assertion.$typeName).toEqual('dxos.halo.credentials.AuthorizedDevice');
      expect(toPublicKey((assertion as any).deviceKey)?.toHex()).toEqual(deviceKey.toHex());
    }
  });
});

const makeCredential = async () => {
  const keyring = new Keyring();
  const issuer = await keyring.createKey();
  const deviceKey = PublicKey.random();
  return {
    deviceKey,
    credential: await createCredential({
      assertion: create(AuthorizedDeviceSchema, {
        identityKey: fromPublicKey(issuer),
        deviceKey: fromPublicKey(deviceKey),
      }),
      issuer,
      signer: keyring,
      subject: deviceKey,
    }),
  };
};

/** A clone of the credential carrying the spec-form `type.googleapis.com/` prefix `anyPack` writes. */
const withPrefixedAssertionUrl = (credential: Credential): Credential => {
  const clone = fromBinary(CredentialSchema, toBinary(CredentialSchema, credential));
  clone.subject!.assertion!.typeUrl = `type.googleapis.com/${clone.subject!.assertion!.typeUrl}`;
  return clone;
};
