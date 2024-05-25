//
// Copyright 2024 DXOS.org
//

import { Flags } from '@oclif/core';

import { ComposerBaseCommand } from './base';
import { BaseCommand, FLAG_SPACE_KEYS } from '../../base';

// import { FileType } from '@braneframe/types';
// import { type Space } from '@dxos/client-protocol';
// import { create } from '@dxos/echo-schema';
// import { createIpfsClient } from '../../util';

/**
 * Upload IPFS file.
 */
export default class Upload extends ComposerBaseCommand<typeof Upload> {
  static override description = 'Upload IPFS file.';
  static override flags = {
    ...BaseCommand.flags,
    ...FLAG_SPACE_KEYS,
    file: Flags.string({ required: true }),
  };

  async run() {
    console.log('!!!!!');
    // const ipfsClient = createIpfsClient(this.clientConfig);
    // const { cid, path } = await ipfsClient.add(this.flags.file, { pin: true });
    // console.log(cid);

    // const upload = async (space: Space) => {
    //   const obj = create(FileType, { type: 'pdf', title: path, filename: path, cid: cid.toString() });
    //   space.db.add(obj);
    // };

    // return await this.execWithSpace(async ({ space }) => await upload(space), {
    //   spaceKeys: this.flags.key,
    //   verbose: true,
    // });
  }
}
