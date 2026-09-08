//
// Copyright 2026 DXOS.org
//

import { fromBinary, toBinary } from '@bufbuild/protobuf';
import { describe, expect, test } from 'vitest';

import { CredentialSchema } from '@dxos/protocols/buf/dxos/halo/credentials_pb';

import { getCredentialAssertion } from './assertions';
import { issuerOf } from './credential-keys';
import { getCredentialProofPayload } from './signing';
import { GOLDEN_CREDENTIAL_BYTES_B64, GOLDEN_CREDENTIAL_PROOF_PAYLOAD } from './testing/golden-credential';
import { verifyCredential } from './verifier';

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
    expect(
      Buffer.from(getCredentialProofPayload(fromBinary(CredentialSchema, golden))).toString('utf8'),
    ).toEqual(GOLDEN_CREDENTIAL_PROOF_PAYLOAD);
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
