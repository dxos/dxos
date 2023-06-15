//
// Copyright 2023 DXOS.org
//

import { Flags } from '@oclif/core';

import { Agent } from '@dxos/agent';

import { BaseCommand } from '../../base-command';

export default class Run extends BaseCommand<typeof Run> {
  static override enableJsonFlag = true;
  static override description = 'Run agent as foreground process.';

  static override flags = {
    ...BaseCommand.flags,
    listen: Flags.string({
      description: 'RPC endpoints.',
      required: true,
      multiple: true,
    }),
    leader: Flags.boolean({
      description: 'Leader to manage epochs.',
    }),
  };

  async run(): Promise<any> {
    const agent = new Agent(this.clientConfig, { listen: this.flags.listen });
    await agent.start();

    if (this.flags.leader) {
      await agent.monitorEpochs();
    }

    this.log('Agent started... (ctrl-c to exit)');
  }
}
