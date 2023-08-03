//
// Copyright 2023 DXOS.org
//

import { Args, Flags } from '@oclif/core';

import { Client } from '@dxos/client';

import { BaseCommand } from '../../base-command';
import { selectSpace } from '../../util';

// TODO(burdon): Testing plugin (vs. debug)?
export default class Generate extends BaseCommand<typeof Generate> {
  static override enableJsonFlag = true;
  static override description = 'Generate test data.';

  // TODO(burdon): Uniformly provide as arg/flag?
  static override args = { key: Args.string({ description: 'Space key head in hex.' }) };
  static override flags = {
    ...BaseCommand.flags,
    objects: Flags.integer({
      description: 'Number of objects.',
    }),
    mutations: Flags.integer({
      description: 'Number of mutations.',
    }),
  };

  async run(): Promise<any> {
    let { key } = this.args;
    return await this.execWithClient(async (client: Client) => {
      const spaces = client.spaces.get();
      if (!key) {
        key = await selectSpace(spaces);
      }

      const space = spaces.find((space) => space.key.toHex().startsWith(key!));
      if (!space) {
        this.error('Invalid key');
      }

      // TODO(burdon): Generate N documents.
      // TODO(burdon): Generate N mutations (see debug plugin).
      await space.waitUntilReady();
    });
  }
}
