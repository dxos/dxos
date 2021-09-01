//
// Copyright 2020 DXOS.org
//

import debug from 'debug';
import pify from 'pify';

import { EchoMetadata, schema } from '@dxos/echo-protocol';
import { IStorage } from '@dxos/random-access-multi-storage';

const log = debug('dxos:snapshot-store');

export class MetadataStore {
  constructor (
    private readonly _storage: IStorage
  ) {}

  async load (): Promise<EchoMetadata> {
    const file = this._storage.createOrOpen('EchoMetadata');
    try {
      const { size } = await pify(file.stat.bind(file))();
      if (size === 0) {
        return { parties: [] };
      }

      const data = await pify(file.read.bind(file))(0, size);
      return schema.getCodecForType('dxos.echo.metadata.EchoMetadata').decode(data);
    } catch (err) {
      if (err.code === 'ENOENT') {
        return { parties: [] };
      } else {
        throw err;
      }
    } finally {
      await pify(file.close.bind(file))();
    }
  }

  async save (metadata: EchoMetadata) {
    const file = this._storage.createOrOpen('EchoMetadata');

    try {
      const data = schema.getCodecForType('dxos.echo.metadata.EchoMetadata').encode(metadata);
      await pify(file.write.bind(file))(0, data);
    } finally {
      await pify(file.close.bind(file))();
    }
  }

  async clear () {
    log('Clearing all echo metadata...');
    await this._storage.destroy();
  }
}
