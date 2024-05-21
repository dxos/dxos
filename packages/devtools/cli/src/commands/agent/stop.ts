//
// Copyright 2023 DXOS.org
//

import { Flags } from '@oclif/core';
import chalk from 'chalk';

import { BaseCommand } from '../../base';

export default class Stop extends BaseCommand<typeof Stop> {
  static override enableJsonFlag = true;
  static override description = 'Stop agent daemon.';

  static override flags = {
    ...BaseCommand.flags,
    all: Flags.boolean({ description: 'Stop all agents.' }),
    force: Flags.boolean({ description: 'Force stop.' }),
    system: Flags.boolean({
      description: 'Run as system daemon.',
      default: false,
    }),
  };

  async run(): Promise<any> {
    return await this.execWithDaemon(async (daemon) => {
      const stop = async (profile: string) => {
        try {
          if (this.flags.force) {
            this.log(chalk`Force stopping agent {yellow ${profile}}`);
          }
          const process = await daemon.stop(profile, { force: this.flags.force });
          if (process) {
            this.log('Agent stopped');
          }
        } catch (err: any) {
          this.catch(err);
        }
      };

      if (this.flags.all) {
        const processes = await daemon.list();
        await Promise.all(
          processes.map(async (process: any) => {
            if (await daemon.isRunning(process.profile!)) {
              await stop(process.profile!);
            }
          }),
        );
      } else {
        await stop(this.flags.profile);
      }
    }, this.flags.system);
  }
}
