//
// Copyright 2024 DXOS.org
//

import { type defs } from '@dxos/config';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { type Credential as BufCredential } from '@dxos/protocols/buf/dxos/halo/credentials_pb';
import { type Client } from '@dxos/react-client';
import { type Credential } from '@dxos/react-client/halo';

export const isTrue = (str?: string | null, strict = true): boolean =>
  strict ? str === 'true' || str === '1' : str != null && !isFalse(str);
export const isFalse = (str?: string | null): boolean => str === 'false' || str === '0';

export const defaultStorageIsEmpty = async (config?: defs.Runtime.Client.Storage): Promise<boolean> => {
  try {
    const { createStorageObjects } = await import('@dxos/client-services');
    const storage = createStorageObjects(config ?? {}).storage;
    const metadataDir = storage.createDirectory('metadata');
    const echoMetadata = metadataDir.getOrCreateFile('EchoMetadata');
    const { size } = await echoMetadata.stat();
    return !(size > 0);
  } catch (err) {
    log.warn('Checking for empty default storage.', { err });
    return true;
  }
};

export const removeQueryParamByValue = (valueToRemove: string) => {
  const url = new URL(window.location.href);
  const params = Array.from(url.searchParams.entries());
  const [name] = params.find(([_, value]) => value === valueToRemove) ?? [null, null];
  if (name) {
    url.searchParams.delete(name);
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
  return new Promise<Credential[]>((resolve, reject) => {
    const credentials: Credential[] = [];
    stream?.subscribe(
      (credential: BufCredential) => {
        credentials.push(credential as never);
      },
      (err: Error) => {
        if (err) {
          reject(err);
        } else {
          resolve(credentials);
        }
      },
    );
  });
};
