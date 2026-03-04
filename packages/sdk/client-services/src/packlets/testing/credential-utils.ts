//
// Copyright 2023 DXOS.org
//

import { createCredential, toBufPublicKey } from '@dxos/credentials';
import { type Signer } from '@dxos/crypto';
import { PublicKey } from '@dxos/keys';
import { create } from '@dxos/protocols/buf';
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
    assertion: create(AuthorizedDeviceSchema, {
      identityKey: toBufPublicKey(issuer),
      deviceKey: toBufPublicKey(PublicKey.random()),
    }),
  });
