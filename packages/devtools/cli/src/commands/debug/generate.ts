//
// Copyright 2023 DXOS.org
//

import { Args, Flags } from '@oclif/core';

import { sleep } from '@dxos/async';
import { type Client } from '@dxos/client';
import { Expando } from '@dxos/client/echo';

import { BaseCommand } from '../../base-command';
import { Random } from '../../util';

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
    interval: Flags.integer({
      description: 'Interval between mutations (ms).',
      default: 0,
    }),
    jitter: Flags.integer({
      description: 'Interval variance (ms).',
      default: 0,
    }),
    objects: Flags.integer({
      description: 'Number of objects.',
      default: 0,
    }),
    mutations: Flags.integer({
      description: 'Number of mutations.',
      default: 0,
    }),
    // TODO(burdon): Remove: trigger via agent.
    epoch: Flags.integer({
      description: 'Number of mutations per epoch.',
    }),
  };

  async run(): Promise<any> {
    const pause = async () => {
      if (this.flags.interval) {
        const period = this.flags.interval + this.flags.jitter ? random.number({ min: 0, max: this.flags.jitter }) : 0;
        await sleep(period);
      }
    };

    const type = 'test';
    return await this.execWithClient(async (client: Client) => {
      const space = await this.getSpace(client, this.args.key);
      for (let i = 0; i < this.flags.objects; i++) {
        space?.db.add(new Expando({ type, title: random.word() }));
        await space.db.flush();
        await pause();
      }

      const { objects } = space?.db.query({ type });
      if (objects.length) {
        for (let i = 0; i < this.flags.mutations; i++) {
          const object = random.element(objects);
          object.title = random.word();
          await space.db.flush();
          await pause();

          // TODO(burdon): Remove: trigger via agent.
          if (this.flags.epoch && i % this.flags.epoch === 0 && i > 0) {
            await space.internal.createEpoch();
            await space.db.flush();
          }
        }
      }
    });
  }
}
