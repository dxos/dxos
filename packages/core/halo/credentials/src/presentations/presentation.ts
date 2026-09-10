//
// Copyright 2023 DXOS.org
//

import { create } from '@bufbuild/protobuf';

import { type Signer } from '@dxos/crypto';
import { type PublicKey } from '@dxos/keys';
import { fromDate, fromPublicKey } from '@dxos/protocols/buf';
import {
  type Chain,
  type Presentation,
  PresentationSchema,
  type Proof,
  ProofSchema,
} from '@dxos/protocols/buf/dxos/halo/credentials_pb';

import { SIGNATURE_TYPE_ED25519 } from '../credentials';
import { getPresentationProofPayload } from './signing';

// TODO(burdon): Rename createPresentation?
export const signPresentation = async ({
  presentation,
  signer,
  signerKey,
  chain,
  nonce,
}: {
  presentation: Presentation;
  signer: Signer;
  signerKey: PublicKey;
  chain?: Chain;
  nonce?: Uint8Array;
}): Promise<Presentation> => {
  const proof: Proof = create(ProofSchema, {
    type: SIGNATURE_TYPE_ED25519,
    value: new Uint8Array(),
    creationDate: fromDate(new Date()),
    signer: fromPublicKey(signerKey),
    nonce,
  });

  const signedPayload = getPresentationProofPayload(presentation.credentials, proof);
  proof.value = await signer.sign(signerKey, signedPayload);
  if (chain) {
    proof.chain = chain;
  }

  return create(PresentationSchema, {
    credentials: presentation.credentials,
    proofs: [...presentation.proofs, proof],
  });
};
