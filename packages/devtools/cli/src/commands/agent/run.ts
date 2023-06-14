//
// Copyright 2023 DXOS.org
//

import { Flags } from '@oclif/core';
import assert from 'node:assert';

import { runServices } from '@dxos/agent';

import { BaseCommand } from '../../base-command';

export default class Run extends BaseCommand {
  static override enableJsonFlag = true;
  static override description = 'Run agent.';

  static override flags = {
    ...BaseCommand.flags,
    listen: Flags.string({
      description: 'RPC endpoints.',
      required: true,
      multiple: true,
    }),
  };

  async run(): Promise<any> {
    const {
      flags: { listen },
    } = await this.parse(Run);

    assert(this.clientConfig);
    await runServices({ listen, config: this.clientConfig });
    this.log('Agent started... (ctrl-c to exit)');
  }
}
