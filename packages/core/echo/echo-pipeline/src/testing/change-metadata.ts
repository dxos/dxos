//
// Copyright 2023 DXOS.org
//

import { log } from '@dxos/log';
import { schema } from '@dxos/protocols';

import { type MetadataStore } from '../metadata';

const EchoMetadata = schema.getCodecForType('dxos.echo.metadata.EchoMetadata');

/**
 * This function will change the storage version in the metadata.
 * This will break your storage and make it unusable.
 * Use this only for testing purposes.
 */
export const changeStorageVersionInMetadata = async (metadata: MetadataStore, version: number) => {
  log.info('Changing storage version in metadata. USE ONLY FOR TESTING.');
  await metadata.load();
  const echoMetadata = metadata.metadata;
  echoMetadata.version = version;
  const file = metadata._directory.getOrCreateFile('EchoMetadata');
  await metadata._writeFile(file, EchoMetadata, echoMetadata);
  await metadata._directory.flush();
};
