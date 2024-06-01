//
// Copyright 2024 DXOS.org
//

import { FileType } from '@braneframe/types';
import { type Space } from '@dxos/client-protocol';
import { create } from '@dxos/echo-schema';

import { ComposerBaseCommand } from './base';
import { BaseCommand, FLAG_SPACE_KEYS } from '../../base';
import { createIpfsClient } from '../../util';

/**
 * Upload IPFS file.
 */
export default class Upload extends ComposerBaseCommand<typeof Upload> {
  static override description = 'Upload IPFS file.';
  static override flags = {
    ...BaseCommand.flags,
    ...FLAG_SPACE_KEYS,
    file: FlagS.String({ required: true }),
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
