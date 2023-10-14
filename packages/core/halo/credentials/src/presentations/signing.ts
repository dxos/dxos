//
// Copyright 2023 DXOS.org
//

import { type Credential, type Proof } from '@dxos/protocols/proto/dxos/halo/credentials';

import { canonicalStringify } from '../credentials/signing';

export const getPresentationProofPayload = (credentials: Credential[], proof: Proof): Uint8Array => {
  const copy = {
    credentials,
    proof: {
      ...proof,
      value: new Uint8Array(),
      chain: undefined,
    },
  };

  return Buffer.from(canonicalStringify(copy));
};
