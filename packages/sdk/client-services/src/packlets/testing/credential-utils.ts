//
// Copyright 2023 DXOS.org
//

import { createCredential } from '@dxos/credentials';
import { Signer } from '@dxos/crypto';
import { PublicKey } from '@dxos/keys';
import { Credential } from '@dxos/protocols/proto/dxos/halo/credentials';

export const createMockCredential = async ({
  signer,
  issuer
}: {
  signer: Signer;
  issuer: PublicKey;
}): Promise<Credential> =>
  createCredential({
    signer,
    issuer,
    subject: new PublicKey(Buffer.from('test')),
    assertion: {
      '@type': 'example.testing.rpc.MessageWithAny',
      payload: {
        '@type': 'google.protobuf.Any',
        value: Buffer.from('test')
      }
    }
  });
