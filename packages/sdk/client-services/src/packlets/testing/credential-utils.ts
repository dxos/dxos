//
// Copyright 2023 DXOS.org
//

import { createCredential } from '@dxos/credentials';
import { type Signer } from '@dxos/crypto';
import { PublicKey } from '@dxos/keys';
import { type Credential } from '@dxos/protocols/proto/dxos/halo/credentials';

export const createMockCredential = async ({
  signer,
  issuer,
}: {
  signer: Signer;
  issuer: PublicKey;
}): Promise<Credential> =>
  createCredential({
    signer,
    issuer,
    subject: new PublicKey(Buffer.from('test')),
    // The assertion must be a real credential type: the services carry credentials as buf messages,
    // whose registry resolves only the types the schema declares.
    assertion: {
      '@type': 'dxos.halo.credentials.AuthorizedDevice',
      'identityKey': issuer,
      'deviceKey': issuer,
    },
  });
