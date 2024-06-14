//
// Copyright 2023 DXOS.org
//

import { type Credential, type Proof } from '@dxos/protocols/proto/dxos/halo/credentials';

import { canonicalStringify } from '../credentials/signing';

export const getPresentationProofPayload = (credentials: Credential[], proof: Proof): Uint8Array => {
  const copy = {
    credentials: credentials.map((credential) => removeEmptyParentCredentialIds(credential)),
    proof: {
      ...proof,
      value: new Uint8Array(),
      chain: undefined,
    },
  };

  return Buffer.from(canonicalStringify(copy));
};

const removeEmptyParentCredentialIds = (credential: Credential): Credential => {
  const copy = {
    ...credential,
    proof: credential.proof
      ? {
          ...credential.proof,
          chain: credential.proof.chain
            ? { credential: removeEmptyParentCredentialIds(credential.proof.chain.credential) }
            : undefined,
        }
      : undefined,
  };
  if (copy.parentCredentialIds?.length === 0) {
    delete copy.parentCredentialIds;
  }
  return copy;
};
