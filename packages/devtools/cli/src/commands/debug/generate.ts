//
// Copyright 2023 DXOS.org
//

import { Args, Flags } from '@oclif/core';

import { Client } from '@dxos/client';
import { Expando } from '@dxos/client/echo';

import { BaseCommand } from '../../base-command';
import { Random, selectSpace } from '../../util';

const random = new Random();

// TODO(burdon): Testing plugin (vs. debug)?
// TODO(burdon): Disable unless NODE_ENV=development?
export default class Generate extends BaseCommand<typeof Generate> {
  static override enableJsonFlag = true;
  static override description = 'Generate test data.';

  // TODO(burdon): Uniformly provide as arg/flag?
  static override args = { key: Args.string({ description: 'Space key head in hex.' }) };
  static override flags = {
    ...BaseCommand.flags,
    objects: Flags.integer({
      description: 'Number of objects.',
      default: 0,
    }),
    mutations: Flags.integer({
      description: 'Number of mutations.',
      default: 0,
    }),
    mutationsPerEpoch: Flags.integer({
      description: 'Number of mutations per epoch.',
    }),
  };

  async run(): Promise<any> {
    let { key } = this.args;
    const { mutationsPerEpoch } = this.flags;
    return await this.execWithClient(async (client: Client) => {
      const spaces = client.spaces.get();
      if (!key) {
        key = await selectSpace(spaces);
      }

      const space = spaces.find((space) => space.key.toHex().startsWith(key!));
      if (!space) {
        this.error('Invalid key');
      }

      await space.waitUntilReady();

      // TODO(burdon): Command to list objects.
      for (let i = 0; i < this.flags.objects; i++) {
        // TODO(burdon): @type is undefined.
        // TODO(burdon): @model is dxos:model/document.
        space?.db.add(new Expando({ type: 'test', title: random.word() }));
        await space.db.flush();
      }

      const { objects } = space?.db.query({ type: 'test' });
      if (objects.length) {
        for (let i = 0; i < this.flags.mutations; i++) {
          const object = random.element(objects);
          object.title = random.word();
          await space.db.flush();

          if (mutationsPerEpoch && i % mutationsPerEpoch === 0 && i > 0) {
            await space.internal.createEpoch();
            await space.db.flush();
          }
        }
      }
    });
  }
}
