//
// Copyright 2022 DXOS.org
//

import { type Signer, subtleCrypto } from '@dxos/crypto';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { type bufWkt, create, timestampFromDate } from '@dxos/protocols/buf';
import {
  type Chain,
  type Credential,
  CredentialSchema,
  ProofSchema,
} from '@dxos/protocols/buf/dxos/halo/credentials_pb';
import { PublicKeySchema } from '@dxos/protocols/buf/dxos/keys_pb';
import { getCredentialProofPayload } from './signing';
import { SIGNATURE_TYPE_ED25519, verifyChain } from './verifier';

/** Helper to convert @dxos/keys PublicKey to buf PublicKey message. */
const toBufPublicKey = (key: PublicKey) => create(PublicKeySchema, { data: key.asUint8Array() });

/**
 * Structural type for credential assertions.
 * Accepts both protobuf.js TypedMessage and plain objects with buf enum values.
 * The `@type` field is the fully-qualified protobuf type name (e.g., 'dxos.halo.credentials.SpaceMember').
 */
export type TypedAssertion = { '@type': string } & Record<string, unknown>;

export type CreateCredentialSignerProps = {
  subject: PublicKey;
  assertion: TypedAssertion;
  nonce?: Uint8Array;
  parentCredentialIds?: PublicKey[];
};

export type CreateCredentialProps = {
  signer: Signer;
  issuer: PublicKey;
  signingKey?: PublicKey;

  // Provided only if signer is different from issuer.
  chain?: Chain;

  subject: PublicKey;
  assertion: TypedAssertion;
  nonce?: Uint8Array;
  parentCredentialIds?: PublicKey[];
};

/**
 * Construct a signed credential message.
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
  invariant(assertion['@type'], 'Invalid assertion.');
  invariant(!!signingKey === !!chain, 'Chain must be provided if and only if the signing key differs from the issuer.');
  if (chain) {
    const result = await verifyChain(chain, issuer, signingKey!);
    invariant(result.kind === 'pass', 'Invalid chain.');
  }

  // Create the credential with proof value and chain fields missing (for signature payload).
  // Assertion is set after create() because buf's create() recursively initializes nested message
  // fields — it would convert the TypedMessage assertion into an empty google.protobuf.Any.
  const credential = create(CredentialSchema, {
    issuer: toBufPublicKey(issuer),
    issuanceDate: timestampFromDate(new Date()),
    subject: {
      id: toBufPublicKey(subject),
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
  credential.subject!.assertion = assertion as unknown as bufWkt.Any;

  // Set proof after creating signature.
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

// TODO(burdon): Use consistently (merge halo/echo protocol packages).
export const createCredentialMessage = (credential: Credential) => {
  return {
    '@type': 'dxos.echo.feed.CredentialsMessage',
    credential,
  };
};

// TODO(burdon): Vs. Signer.
export interface CredentialSigner {
  getIssuer(): PublicKey;
  createCredential: (params: CreateCredentialSignerProps) => Promise<Credential>;
}

/**
 * Issue credentials directly signed by the issuer.
 */
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

/**
 * Issue credentials with transitive proof via a chain.
 */
export const createCredentialSignerWithChain = (
  signer: Signer,
  chain: Chain,
  signingKey: PublicKey,
): CredentialSigner => ({
  getIssuer: () => PublicKey.from(chain.credential!.issuer!.data),
  createCredential: ({ subject, assertion, nonce, parentCredentialIds }) =>
    createCredential({
      signer,
      issuer: PublicKey.from(chain.credential!.issuer!.data),
      signingKey,
      chain,
      subject,
      assertion,
      nonce,
      parentCredentialIds,
    }),
});
