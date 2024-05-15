//
// Copyright 2023 DXOS.org
//

import { type Credential, type Proof } from '@dxos/protocols/proto/dxos/halo/credentials';

import { canonicalStringify } from '../credentials/signing';

export const getPresentationProofPayload = (credentials: Credential[], proof: Proof): Uint8Array => {
  const copy = {
    credentials: credentials.map((credential) => {
      if (credential.parentCredentialIds?.length === 0) {
        delete credential.parentCredentialIds;
      }
      return credential;
    }),
    proof: {
      ...proof,
      value: new Uint8Array(),
      chain: undefined,
    },
  };

  return Buffer.from(canonicalStringify(copy));
};
