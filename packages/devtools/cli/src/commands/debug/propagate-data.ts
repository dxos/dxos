//
// Copyright 2023 DXOS.org
//

import { Args, Flags } from '@oclif/core';
import chalk from 'chalk';
import assert from 'node:assert';

import { Client, Expando, PublicKey } from '@dxos/client';

import { BaseCommand } from '../../base-command';
import { selectSpace } from '../../util';

export default class PropagateData extends BaseCommand<typeof PropagateData> {
  static override description = 'Pollutes selected space with test data.';
  static override flags = {
    ...BaseCommand.flags,
    mutations: Flags.integer({
      description: 'Number of mutations.',
      default: 10000,
    }),
    epochEach: Flags.integer({
      description: 'Epoch each N mutations.',
      default: 100,
    }),
  };

  static override args = {
    ...BaseCommand.args,
    key: Args.string({
      description: 'Space key head in hex.',
    }),
  };

  async run(): Promise<any> {
    return await this.execWithClient(async (client: Client) => {
      let { key } = this.args;

      const spaces = client.spaces.get();
      if (!key) {
        key = await selectSpace(spaces);
      }

      assert(key);

      const space = spaces.find((space) => space.key.toHex().startsWith(key!));
      if (!space) {
        this.log(chalk`{red Invalid space key}`);
        return;
      }
      await space.waitUntilReady();

      for (let index = 0; index < this.flags.mutations; index++) {
        const expando = new Expando();
        expando[PublicKey.random().toHex()] = { value: PublicKey.random().toHex() };
        space.db.add(expando);
        await space.db.flush();

        if (index !== 0 && index % this.flags.epochEach === 0) {
          await client.services.services.SpacesService?.createEpoch({ spaceKey: space.key });
        }
      }

      this.log(chalk`{green Done}`);
    });
  }
}
