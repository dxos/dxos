//
// Copyright 2023 DXOS.org
//

import { log } from '@dxos/log';
import { EchoMetadataSchema } from '@dxos/protocols/buf/dxos/echo/metadata_pb';
import type { Storage } from '@dxos/random-access-storage';

import { MetadataStore } from '../../metadata/index.ts';

/**
 * This function will change the storage version in the metadata.
 * This will break your storage and make it unusable.
 * Use this only for testing purposes.
 */
export const changeStorageVersionInMetadata = async (storage: Storage, version: number) => {
  log('Changing storage version in metadata. USE ONLY FOR TESTING.');
  const metadata = new MetadataStore(storage.createDirectory('metadata'));
  await metadata.load();
  const echoMetadata = metadata.metadata;
  echoMetadata.version = version;
  const file = metadata._directory.getOrCreateFile('EchoMetadata');
  await metadata._writeFile(file, EchoMetadataSchema, echoMetadata);
  await metadata._directory.flush();
};
