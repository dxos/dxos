//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { buf } from '@dxos/protocols/buf';
import { compatCodec, decodeCompat, encodeCompat } from '@dxos/protocols/buf-shape-compat';
import { CredentialSchema } from '@dxos/protocols/buf/dxos/halo/credentials_pb';
import { schema } from '@dxos/protocols/proto';
import { type Credential } from '@dxos/protocols/proto/dxos/halo/credentials';

import { getCredentialProofPayload } from './signing';
import { GOLDEN_CREDENTIAL_BYTES_B64, GOLDEN_CREDENTIAL_PROOF_PAYLOAD } from './testing/golden-credential';
import { verifyCredential } from './verifier';

// The guard the other compat tests cannot be: they generate a credential from the current tree with
// both codecs, so a shape change moves both sides together and they still agree. These bytes were
// signed by a build that predates whatever change is being made, so only they can catch a codec that
// has started producing a different signing payload.

const golden = Buffer.from(GOLDEN_CREDENTIAL_BYTES_B64, 'base64');
const legacyCodec = schema.getCodecForType('dxos.halo.credentials.Credential');
const bufCodec = compatCodec<Credential>(CredentialSchema);

describe('a credential signed by an earlier build', () => {
  test('still verifies through the protobuf.js codec', async () => {
    expect(await verifyCredential(legacyCodec.decode(golden))).toEqual({ kind: 'pass' });
  });

  test('still verifies through the buf codec', async () => {
    expect(await verifyCredential(bufCodec.decode(golden))).toEqual({ kind: 'pass' });
  });

  test('and both codecs reproduce its signing payload byte for byte', () => {
    // The payload is the whole signature format: a field that moves, gains a default, or serialises
    // differently shows up here as a diff rather than as an unverifiable credential in the field.
    expect(Buffer.from(getCredentialProofPayload(legacyCodec.decode(golden))).toString('utf8')).toEqual(
      GOLDEN_CREDENTIAL_PROOF_PAYLOAD,
    );
    expect(Buffer.from(getCredentialProofPayload(bufCodec.decode(golden))).toString('utf8')).toEqual(
      GOLDEN_CREDENTIAL_PROOF_PAYLOAD,
    );
  });

  test('and re-encoding it is byte-identical on either codec', () => {
    // Nothing re-signs a stored credential, so a peer that re-encodes one must produce the same bytes
    // or its id (a hash of them) changes and the credentials document keys it under the wrong entry.
    expect(new Uint8Array(legacyCodec.encode(legacyCodec.decode(golden)))).toEqual(new Uint8Array(golden));
    expect(new Uint8Array(encodeCompat(CredentialSchema, decodeCompat<Credential>(CredentialSchema, golden)))).toEqual(
      new Uint8Array(golden),
    );
  });

  test('the buf message and the substituted shape describe the same credential', () => {
    // Guards the direction a shape migration would take: a buf-native `Credential` must still carry
    // the values the signing payload is computed from.
    const bufCredential = buf.fromBinary(CredentialSchema, golden);
    const substituted = bufCodec.decode(golden);
    expect(Buffer.from(bufCredential.issuer!.data).toString('hex')).toEqual(substituted.issuer.toHex());
    expect(bufCredential.subject?.assertion?.typeUrl).toEqual('dxos.halo.credentials.AuthorizedDevice');
    expect(substituted.subject.assertion['@type']).toEqual('dxos.halo.credentials.AuthorizedDevice');
  });
});
