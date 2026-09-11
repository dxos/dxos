//
// Copyright 2023 DXOS.org
//

import { type Credential, type Proof } from '@dxos/protocols/buf/dxos/halo/credentials_pb';

import { canonicalStringify, toProofSigningShape, toSigningShape } from '../credentials/signing.ts';

export const getPresentationProofPayload = (credentials: Credential[], proof: Proof): Uint8Array => {
  const copy = {
    credentials: credentials.map((credential) => removeEmptyParentCredentialIds(toSigningShape(credential))),
    proof: {
      ...toProofSigningShape(proof),
      value: new Uint8Array(),
      chain: undefined,
    },
  };

  return Buffer.from(canonicalStringify(copy));
};

/**
 * Drops an empty `parentCredentialIds`, at every depth of the chain.
 *
 * Proto3 omits an empty repeated field on the wire, so a credential that round-trips loses it; the
 * payload has to match either way, whether it was signed before or after a round-trip.
 */
const removeEmptyParentCredentialIds = (shape: Record<string, unknown>): Record<string, unknown> => {
  const proof = shape.proof as Record<string, unknown> | undefined;
  const chain = proof?.chain as { credential?: Record<string, unknown> } | undefined;
  const resolved: Record<string, unknown> = {
    ...shape,
    proof:
      proof &&
      ({
        ...proof,
        chain: chain?.credential ? { credential: removeEmptyParentCredentialIds(chain.credential) } : undefined,
      } satisfies Record<string, unknown>),
  };
  const { parentCredentialIds, ...rest } = resolved;
  return Array.isArray(parentCredentialIds) && parentCredentialIds.length === 0
    ? rest
    : { ...rest, parentCredentialIds };
};
