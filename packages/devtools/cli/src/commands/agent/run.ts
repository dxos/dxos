//
// Copyright 2023 DXOS.org
//

import { Flags } from '@oclif/core';

import { Agent } from '@dxos/agent';

import { BaseCommand } from '../../base-command';

export default class Run extends BaseCommand<typeof Run> {
  static override enableJsonFlag = true;
  static override description = 'Run agent in foreground process.';

  static override flags = {
    ...BaseCommand.flags,
    listen: Flags.string({
      description: 'RPC endpoints.',
      required: true,
      multiple: true,
    }),
  };

  async run(): Promise<any> {
    const agent = new Agent(this.clientConfig, { listen: this.flags.listen });
    await agent.start();

    // TODO(burdon): Option.
    await agent.manageEpochs();

    this.log('Agent started... (ctrl-c to exit)');
  }
}
