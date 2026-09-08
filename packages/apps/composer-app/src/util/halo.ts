//
// Copyright 2024 DXOS.org
//

import { invariant } from '@dxos/invariant';
import { buf } from '@dxos/protocols/buf';
import { decodeCompat } from '@dxos/protocols/buf-shape-compat';
import { CredentialSchema } from '@dxos/protocols/buf/dxos/halo/credentials_pb';
import { type Client } from '@dxos/react-client';
import { type Credential } from '@dxos/react-client/halo';

// TODO(wittjosiah): Factor out to sdk.
//   Currently the HaloProxy.queryCredentials method is synchronous.
//   Since it is synchronous, it only returns credentials that are already loaded in the client.
//   This function ensures that all credentials on disk are loaded into the client before returning.
export const queryAllCredentials = (client: Client) => {
  const identitySpace = client.halo.identity.get()?.spaceKey;
  if (!identitySpace) {
    return Promise.resolve([] as Credential[]);
  }

  invariant(client.services.services.SpacesService, 'SpacesService not available');
  const stream = client.services.services.SpacesService.queryCredentials({
    spaceKey: identitySpace,
    noTail: true,
  });
  invariant(stream, 'queryCredentials stream not available');

  return new Promise<Credential[]>((resolve, reject) => {
    const credentials: Credential[] = [];
    stream.subscribe(
      (credential) => {
        // Callers index `subject.assertion` by '@type', which is the protobuf.js Any substitution.
        credentials.push(decodeCompat(CredentialSchema, buf.toBinary(CredentialSchema, credential)));
      },
      (err) => {
        if (err) {
          reject(err);
        } else {
          resolve(credentials);
        }
      },
    );
  });
};
