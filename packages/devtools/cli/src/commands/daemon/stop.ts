//
// Copyright 2023 DXOS.org
//

import { Args } from '@oclif/core';

import { BaseCommand } from '../../base-command';

export default class Stop extends BaseCommand {
  static override enableJsonFlag = true;
  static override description = 'Stop daemon process.';

  static override args = {
    ...BaseCommand.args,
    name: Args.string({
      name: 'Process name.',
    }),
  };

  async run(): Promise<any> {
    return await this.execWithDaemon(async (daemon) => {
      const params = await this.parse(Stop);
      await daemon.stop(params.args.name);

      this.log('Stopped');
    });
  }
}
