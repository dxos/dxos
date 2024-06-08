//
// Copyright 2024 DXOS.org
//

import { Flags } from '@oclif/core';

import { FileType } from '@braneframe/types';
import { FLAG_SPACE_KEYS, createIpfsClient } from '@dxos/cli-base';
import { type Space } from '@dxos/client-protocol';
import { create } from '@dxos/echo-schema';

import { BaseCommand } from '../../base';

/**
 * Upload IPFS file.
 */
export default class Upload extends BaseCommand<typeof Upload> {
  static override description = 'Upload IPFS file.';
  static override flags = {
    ...BaseCommand.flags,
    ...FLAG_SPACE_KEYS,
    file: Flags.string({ required: true }),
  };

  async run() {
    const [_, type] = this.flags.file.split('.');
    const ipfsClient = await createIpfsClient(this.clientConfig);
    const { cid, path } = await ipfsClient.add(this.flags.file, { pin: true });
    if (this.flags.verbose) {
      this.log(`Uploaded to IPFS: ${cid}`);
    }

    const upload = async (space: Space) => {
      const obj = space.db.add(create(FileType, { type, title: path, filename: path, cid: cid.toString() }));
      if (this.flags.verbose) {
        this.log(`Created object: ${obj.id}`);
      }
    };

    return await this.execWithSpace(async ({ space }) => await upload(space), {
      spaceKeys: this.flags.key,
      verbose: true,
    });
  }
}
