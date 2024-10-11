//
// Copyright 2024 DXOS.org
//

import { type defs } from '@dxos/config';
import { log } from '@dxos/log';

export const isTrue = (str?: string) => str === 'true' || str === '1';
export const isFalse = (str?: string) => str === 'false' || str === '0';

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
