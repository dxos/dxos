//

//
// Copyright 2023 DXOS.org
//

import { Flags } from '@oclif/core';
import assert from 'node:assert';

import { BaseCommand } from '../../base-command';
import { runServices } from '../../daemon';

export default class Run extends BaseCommand {
  static override enableJsonFlag = true;
  static override description = 'Run daemon process.';

  static override flags = {
    ...BaseCommand.flags,
    listen: Flags.string({
      description: 'Expose services.',
      required: true,
    }),
    profile: Flags.string({
      description: 'Profile to use.',
      required: true,
    }),
  };

  async run(): Promise<any> {
    const {
      flags: { listen, profile },
    } = await this.parse(Run);
    assert(this.clientConfig);
    await runServices({ listen, profile, config: this.clientConfig });

    this.log('daemon started');
  }
}
