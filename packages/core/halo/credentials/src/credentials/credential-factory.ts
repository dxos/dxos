//
// Copyright 2022 DXOS.org
//

import { type Signer, subtleCrypto } from '@dxos/crypto';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { create, timestampFromDate, toPublicKey } from '@dxos/protocols/buf';
import {
  type Chain,
  type Credential,
  CredentialSchema,
  ProofSchema,
} from '@dxos/protocols/buf/dxos/halo/credentials_pb';
import { PublicKeySchema } from '@dxos/protocols/buf/dxos/keys_pb';

import { type CredentialAssertion } from './assertion-registry';
import { packAssertion } from './credential';
import { getCredentialProofPayload } from './signing';
import { SIGNATURE_TYPE_ED25519, verifyChain } from './verifier';

/** Convert @dxos/keys PublicKey to buf PublicKey message. */
export const toBufPublicKey = (key: PublicKey | { data: Uint8Array }) => {
  if (key instanceof PublicKey) {
    return create(PublicKeySchema, { data: key.asUint8Array() });
  }
  if (key && typeof key === 'object' && 'data' in key && key.data instanceof Uint8Array) {
    return create(PublicKeySchema, { data: key.data });
  }
  return create(PublicKeySchema, { data: (key as any).asUint8Array() });
};

export type CreateCredentialSignerProps = {
  subject: PublicKey;
  assertion: CredentialAssertion;
  nonce?: Uint8Array;
  parentCredentialIds?: PublicKey[];
};

export type CreateCredentialProps = {
  signer: Signer;
  issuer: PublicKey;
  signingKey?: PublicKey;

  /** Provided only if signer is different from issuer. */
  chain?: Chain;

  subject: PublicKey;
  assertion: CredentialAssertion;
  nonce?: Uint8Array;
  parentCredentialIds?: PublicKey[];
};

/**
 * Construct a signed credential message.
 * The assertion must be a proper buf message (from CredentialAssertion union).
 * Returns a Credential with the assertion packed as google.protobuf.Any.
 */
export const createCredential = async ({
  signer,
  issuer,
  subject,
  assertion,
  signingKey,
  chain,
  nonce,
  parentCredentialIds,
}: CreateCredentialProps): Promise<Credential> => {
  invariant(assertion.$typeName, 'Invalid assertion: missing $typeName.');
  invariant(!!signingKey === !!chain, 'Chain must be provided if and only if the signing key differs from the issuer.');
  if (chain) {
    const result = await verifyChain(chain, issuer, signingKey!);
    invariant(result.kind === 'pass', 'Invalid chain.');
  }

  // Pack assertion into Any for the credential struct.
  const packedAssertion = packAssertion(assertion);

  const credential = create(CredentialSchema, {
    issuer: toBufPublicKey(issuer),
    issuanceDate: timestampFromDate(new Date()),
    subject: {
      id: toBufPublicKey(subject),
      assertion: packedAssertion,
    },
    parentCredentialIds: parentCredentialIds?.map(toBufPublicKey),
    proof: create(ProofSchema, {
      type: SIGNATURE_TYPE_ED25519,
      creationDate: timestampFromDate(new Date()),
      signer: toBufPublicKey(signingKey ?? issuer),
      value: new Uint8Array(),
      nonce,
    }),
  });

  // Sign the credential (getCredentialProofPayload unpacks Any for canonical stringification).
  const signedPayload = getCredentialProofPayload(credential);
  credential.proof!.value = await signer.sign(signingKey ?? issuer, signedPayload);
  if (chain) {
    credential.proof!.chain = chain;
  }

  credential.id = toBufPublicKey(
    PublicKey.from(await subtleCrypto.digest('SHA-256', signedPayload as Uint8Array<ArrayBuffer>)),
  );

  return credential;
};

// TODO(burdon): Vs. Signer.
export interface CredentialSigner {
  getIssuer(): PublicKey;
  createCredential: (params: CreateCredentialSignerProps) => Promise<Credential>;
}

/** Issue credentials directly signed by the issuer. */
export const createCredentialSignerWithKey = (signer: Signer, issuer: PublicKey): CredentialSigner => ({
  getIssuer: () => issuer,
  createCredential: ({ subject, assertion, nonce, parentCredentialIds }) =>
    createCredential({
      signer,
      issuer,
      subject,
      assertion,
      nonce,
      parentCredentialIds,
    }),
});

/** Issue credentials with transitive proof via a chain. */
export const createCredentialSignerWithChain = (
  signer: Signer,
  chain: Chain,
  signingKey: PublicKey,
): CredentialSigner => ({
  getIssuer: () => toPublicKey(chain.credential!.issuer!),
  createCredential: ({ subject, assertion, nonce, parentCredentialIds }) =>
    createCredential({
      signer,
      issuer: toPublicKey(chain.credential!.issuer!),
      signingKey,
      chain,
      subject,
      assertion,
      nonce,
      parentCredentialIds,
    }),
});
