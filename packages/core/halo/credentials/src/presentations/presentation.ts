//
// Copyright 2023 DXOS.org
//

import { type Signer } from '@dxos/crypto';
import { type PublicKey } from '@dxos/keys';
import { type Chain, type Presentation, type Proof } from '@dxos/protocols/proto/dxos/halo/credentials';

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
  const proof: Proof = {
    type: SIGNATURE_TYPE_ED25519,
    value: new Uint8Array(),
    creationDate: new Date(),
    signer: signerKey,
    nonce,
  };

  const signedPayload = getPresentationProofPayload(presentation.credentials ?? [], proof);
  proof.value = await signer.sign(signerKey, signedPayload);
  if (chain) {
    proof.chain = chain;
  }

  return {
    credentials: presentation.credentials,
    proofs: [...(presentation.proofs ?? []), proof],
  };
};
