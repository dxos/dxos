//
// Copyright 2024 DXOS.org
//

import { invariant } from '@dxos/invariant';
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

  return new Promise<Credential[]>((resolve, reject) => {
    const credentials: Credential[] = [];
    stream?.subscribe(
      (credential) => {
        credentials.push(credential);
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
