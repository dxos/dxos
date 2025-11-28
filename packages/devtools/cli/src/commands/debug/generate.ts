//
// Copyright 2023 DXOS.org
//

import { Flags } from '@oclif/core';

import { sleep } from '@dxos/async';
import { ARG_SPACE_KEYS } from '@dxos/cli-base';
import { Filter, Obj, Type } from '@dxos/echo';
import { faker } from '@dxos/random';

import { BaseCommand } from '../../base';

// TODO(burdon): Testing plugin (vs. debug)?
// TODO(burdon): Disable unless NODE_ENV=development?
export default class Generate extends BaseCommand<typeof Generate> {
  static override enableJsonFlag = true;
  static override description = 'Generate test data.';
  static override args = ARG_SPACE_KEYS;
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
        const period =
          this.flags.interval + this.flags.jitter ? faker.number.int({ min: 0, max: this.flags.jitter }) : 0;
        await sleep(period);
      }
    };

    const type = 'test';
    return await this.execWithClient(async ({ client }) => {
      const space = await this.getSpace(client, this.args.key);
      for (let i = 0; i < this.flags.objects; i++) {
        space?.db.add(Obj.make(Type.Expando, { type, title: faker.lorem.word() }));
        await space.db.flush();
        await pause();
      }

      const objects = (await space?.db.query(Filter.type(Type.Expando, { type }))?.run()) ?? [];
      if (objects.length) {
        for (let i = 0; i < this.flags.mutations; i++) {
          const object = faker.helpers.arrayElement(objects);
          object.title = faker.lorem.word();
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
