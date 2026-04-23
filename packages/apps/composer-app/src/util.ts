//
// Copyright 2024 DXOS.org
//

import { type defs } from '@dxos/config';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { type Client } from '@dxos/react-client';
import { type Credential } from '@dxos/react-client/halo';
import { clearCaches, clearIndexedDB, clearOPFS, clearServiceWorkers } from '@dxos/util';

// Danger: Deleting this localStorage key will cause all storage (including identity) to be
// wiped on the next page load. Do not clear it unless you intend to trigger a full reset.
const DANGEROUSLY_RESET_STORAGE_KEY = 'org.dxos.composer.dangerouslyResetStorage';
const DANGEROUSLY_RESET_STORAGE_VERSION = 'v1';

/**
 * Returns true if the one-time full storage reset migration should run for the given environment.
 */
export const shouldRunStorageResetMigration = (environment?: string): boolean => {
  const isProductionOrStaging = ['production', 'staging'].includes(environment ?? '');
  return (
    isProductionOrStaging && localStorage.getItem(DANGEROUSLY_RESET_STORAGE_KEY) !== DANGEROUSLY_RESET_STORAGE_VERSION
  );
};

/**
 * Performs the one-time full storage reset: clears IndexedDB, OPFS, service workers, caches,
 * localStorage, and sessionStorage, then records the version flag so the migration does not re-run.
 * Only sets the flag when all cleanup steps succeed; failed runs can be retried on next load.
 * Caller should redirect and halt boot after this resolves.
 */
export const runStorageResetMigration = async (): Promise<void> => {
  log.info('Performing one-time storage reset.');

  const errors: Array<{ label: string; error: unknown }> = [];
  const run = async (label: string, fn: () => Promise<void> | void): Promise<void> => {
    try {
      await fn();
    } catch (error) {
      log.catch(error, { label });
      errors.push({ label, error });
    }
  };

  await run('clearIndexedDB', clearIndexedDB);
  await run('clearOPFS', clearOPFS);
  await run('clearServiceWorkers', clearServiceWorkers);
  await run('clearCaches', clearCaches);
  await run('clearLocalStorage', () => localStorage.clear());
  await run('clearSessionStorage', () => sessionStorage.clear());

  if (errors.length > 0) {
    throw new Error(`Storage reset migration failed: ${errors.map(({ label }) => label).join(', ')}`);
  }

  // Set flag AFTER clearing localStorage so this migration does not re-run.
  localStorage.setItem(DANGEROUSLY_RESET_STORAGE_KEY, DANGEROUSLY_RESET_STORAGE_VERSION);
};

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
