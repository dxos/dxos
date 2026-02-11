//
// Copyright 2023 DXOS.org
//

import { type Signer } from '@dxos/crypto';
import { PublicKey } from '@dxos/keys';
import { create, timestampFromDate } from '@dxos/protocols/buf';
import {
  type Chain,
  type Presentation,
  PresentationSchema,
  type Proof,
  ProofSchema,
} from '@dxos/protocols/buf/dxos/halo/credentials_pb';
import { PublicKeySchema } from '@dxos/protocols/buf/dxos/keys_pb';

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
  const proof = create(ProofSchema, {
    type: SIGNATURE_TYPE_ED25519,
    value: new Uint8Array(),
    creationDate: timestampFromDate(new Date()),
    signer: create(PublicKeySchema, { data: signerKey.asUint8Array() }),
    nonce,
  });

  const signedPayload = getPresentationProofPayload(presentation.credentials ?? [], proof);
  proof.value = await signer.sign(signerKey, signedPayload);
  if (chain) {
    proof.chain = chain;
  }

  return create(PresentationSchema, {
    credentials: presentation.credentials,
    proofs: [...(presentation.proofs ?? []), proof],
  });
};
