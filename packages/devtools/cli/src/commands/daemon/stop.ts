//
// Copyright 2023 DXOS.org
//

import { Args } from '@oclif/core';
import { Proc } from 'pm2';

import { BaseCommand } from '../../base-command';
import { getPm2 } from '../../daemon';

export default class Stop extends BaseCommand {
  static override enableJsonFlag = true;
  static override description = 'Stop daemon process.';

  static override args = {
    ...BaseCommand.args,
    name: Args.string({
      name: 'Process name.',
      default: 'default',
    }),
  };

  async run(): Promise<any> {
    const pm2 = await getPm2();
    const params = await this.parse(Stop);

    await new Promise<Proc>((resolve, reject) => {
      pm2.stop(params.args.name, (err, proc) => {
        if (err) {
          reject(err);
        } else {
          resolve(proc!);
        }
      });
    });

    this.log('Stopped');
    pm2.disconnect();
  }
}
