//
// Copyright 2023 DXOS.org
//

import { Args, Flags } from '@oclif/core';
import chalk from 'chalk';

import { Client, Expando, PublicKey } from '@dxos/client';

import { BaseCommand } from '../../base-command';
import { selectSpace } from '../../util';

// TODO(burdon): Remove from CLI.
export default class EchoTestData extends BaseCommand<typeof EchoTestData> {
  static override description = 'Generates test data.';
  static override flags = {
    ...BaseCommand.flags,
    mutations: Flags.integer({
      description: 'Number of mutations.',
      default: 1000,
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
      }

      this.log(chalk`{green Done}`);
    });
  }
}
