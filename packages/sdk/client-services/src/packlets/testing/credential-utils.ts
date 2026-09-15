//
// Copyright 2023 DXOS.org
//

import { create } from '@bufbuild/protobuf';

import { createCredential } from '@dxos/credentials';
import { type Signer } from '@dxos/crypto';
import { PublicKey } from '@dxos/keys';
import { fromPublicKey } from '@dxos/protocols/buf';
import { AuthorizedDeviceSchema, type Credential } from '@dxos/protocols/buf/dxos/halo/credentials_pb';

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
    assertion: create(AuthorizedDeviceSchema, { identityKey: fromPublicKey(issuer), deviceKey: fromPublicKey(issuer) }),
  });
