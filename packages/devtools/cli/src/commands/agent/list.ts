//
// Copyright 2023 DXOS.org
//

import { Flags } from '@oclif/core';

import { TABLE_FLAGS, printAgents } from '@dxos/cli-base';

import { BaseCommand } from '../../base';

export default class List extends BaseCommand<typeof List> {
  static override enableJsonFlag = true;
  static override description = 'List agents.';
  static override flags = {
    ...BaseCommand.flags,
    ...TABLE_FLAGS,
    live: Flags.boolean({
      description: 'Live update.',
      default: false,
    }),
    system: Flags.boolean({
      description: 'Run as system daemon.',
      default: false,
    }),
  };

  async run(): Promise<any> {
    return await this.execWithDaemon(async (daemon) => {
      const result = await daemon.list();
      if (this.flags.json) {
        return result;
      } else {
        // TODO(burdon): q to quit.
        if (this.flags.live) {
          console.clear();
          setInterval(async () => {
            const result = await daemon.list();
            console.clear();
            printAgents(result, this.flags);
          }, 1_000);
        } else {
          printAgents(result, this.flags);
        }
      }
    }, this.flags.system);
  }
}
