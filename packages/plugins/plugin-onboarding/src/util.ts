//
// Copyright 2025 DXOS.org
//

import { invariant } from '@dxos/invariant';
import { type Client } from '@dxos/react-client';
import { type Credential } from '@dxos/react-client/halo';

export const removeQueryParamByValue = (valueToRemove: string) => {
  const url = new URL(window.location.href);
  const params = Array.from(url.searchParams.entries());
  const match = params.find(([_, value]) => value === valueToRemove);
  if (match) {
    const next = new URLSearchParams();
    let removed = false;
    for (const [key, value] of params) {
      if (!removed && key === match[0] && value === valueToRemove) {
        removed = true;
        continue;
      }
      next.append(key, value);
    }
    url.search = next.toString();
    history.replaceState({}, document.title, url.href);
  }
};

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
