//


import { log } from '@dxos/log';
import { promisify } from 'util';
import { BaseCommand } from '../../base-command';
import { getPm2 } from '../../daemon/pm2';

export default class List extends BaseCommand {
  static override enableJsonFlag = true;
  static override description = 'Run daemon process.';

  async run(): Promise<any> {
    const pm2 = await getPm2();

    log.info('Listing processes...');
    const list = await promisify(pm2.list.bind(pm2))()
    log.info('Processes:', { list });

    pm2.disconnect()

    return list;
  }
}
