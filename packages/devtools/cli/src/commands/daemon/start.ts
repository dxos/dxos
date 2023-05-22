//
// Copyright 2023 DXOS.org
//

import { Flags } from '@oclif/core';
import { Proc } from 'pm2';

import { BaseCommand } from '../../base-command';
import { getPm2 } from '../../daemon';

export default class Start extends BaseCommand {
  static override enableJsonFlag = true;
  static override description = 'Start daemon process.';

  static override flags = {
    ...BaseCommand.flags,
    profile: Flags.string({
      description: 'Profile name.',
      default: 'default',
    }),
  };

  async run(): Promise<any> {
    const pm2 = await getPm2();
    const params = await this.parse(Start);

    const proc = await new Promise<Proc[]>((resolve, reject) => {
      pm2.start(
        {
          script: process.argv[1],
          args: [
            'daemon',
            'run',
            `--listen=unix://${process.env.HOME}/.dx/run/${params.flags.profile}.sock`,
            '--profile=' + params.flags.profile!,
          ],
          name: params.flags.profile!,
        },
        (err, proc) => {
          if (err) {
            reject(err);
          } else {
            // Return type does not equal to runtime return type im PM2.
            resolve(proc! as Proc[]);
          }
        },
      );
    });

    if (proc.length === 0) {
      throw new Error('Daemon is not started');
    }
    this.log('Started:', { id: proc[0].pm_id, name: proc[0].name });
    pm2.disconnect();
  }
}
