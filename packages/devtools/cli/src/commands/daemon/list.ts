//

//
// Copyright 2023 DXOS.org
//

import { promisify } from 'util';

import { log } from '@dxos/log';

import { BaseCommand } from '../../base-command';
import { getPm2 } from '../../daemon/pm2';

export default class List extends BaseCommand {
  static override enableJsonFlag = true;
  static override description = 'Run daemon process.';

  async run(): Promise<any> {
    const pm2 = await getPm2();

    log.info('Listing processes...');
    const list = await promisify(pm2.list.bind(pm2))();

    pm2.disconnect();

    const result = list.map((proc) => ({
      name: proc.name,
      pid: proc.pid,
      cpu: proc.monit?.cpu,
      memory: proc.monit?.memory
    }));

    console.log(result);

    return result;
  }
}
