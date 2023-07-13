//
// Copyright 2023 DXOS.org
//



import { runFunctions } from '@dxos/functions';
import { join } from 'node:path';
import { BaseCommand } from '../../base-command';

export default class Dev extends BaseCommand<typeof Dev> {
  static override enableJsonFlag = true;
  static override description = 'Functions dev server.';

  static override args = {

  };

  async run(): Promise<any> {
    await this.execWithClient(async (client) => {
      runFunctions({
        client,
        functionsDirectory: join(process.cwd(), 'src/functions')
      })
    });
  }
}
