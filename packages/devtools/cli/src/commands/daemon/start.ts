//
// Copyright 2023 DXOS.org
//

import { Flags } from '@oclif/core';
import { Proc } from 'pm2';

import { log } from '@dxos/log';

import { BaseCommand } from '../../base-command';
import { getPm2 } from '../../daemon/pm2';

export default class Start extends BaseCommand {
  static override enableJsonFlag = true;
  static override description = 'Start daemon process.';

  static override flags = {
    ...BaseCommand.flags,
    profile: Flags.string({
      description: 'Profile name.'
    })
  };

  async run(): Promise<any> {
    const pm2 = await getPm2();
    const params = await this.parse(Start);

    const proc = await new Promise<Proc>((resolve, reject) => {
      pm2.start(
        {
          script: process.argv[1],
          args: [
            'daemon',
            'run',
            `--listen=unix://${process.env.HOME}/.dx/run/${params.flags.profile}.sock`,
            '--profile=' + params.flags.profile!
          ],
          name: params.flags.profile!
        },
        (err, proc) => {
          if (err) {
            reject(err);
          } else {
            resolve(proc!);
          }
        }
      );
    });

    log.info('Started:', { id: proc.pm_id, name: proc.name });
    pm2.disconnect();
  }
}
