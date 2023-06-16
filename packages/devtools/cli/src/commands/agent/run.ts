//
// Copyright 2023 DXOS.org
//

import { Flags } from '@oclif/core';

import { Agent } from '@dxos/agent';
import { DX_RUNTIME } from '@dxos/client-protocol';

import { BaseCommand } from '../../base-command';

export default class Run extends BaseCommand<typeof Run> {
  static override enableJsonFlag = true;
  static override description = 'Run agent as foreground process.';

  static override flags = {
    ...BaseCommand.flags,
    socket: Flags.boolean({
      description: 'Expose socket.',
    }),
    'web-socket': Flags.integer({
      description: 'Expose web socket port.',
      aliases: ['ws'],
    }),
    http: Flags.integer({
      description: 'Expose HTTP proxy.',
    }),
    leader: Flags.boolean({
      description: 'Leader to manage epochs.',
    }),
  };

  async run(): Promise<any> {
    const listen = [];
    if (this.flags.socket) {
      listen.push(`unix://${DX_RUNTIME}/profile/${this.flags.profile}/agent.sock`);
    }
    if (this.flags['web-socket']) {
      listen.push(`ws://localhost:${this.flags['web-socket']}`);
    }
    if (this.flags.http) {
      listen.push(`http://localhost:${this.flags.http}`);
    }

    const agent = new Agent(this.clientConfig, { listen });
    await agent.start();

    if (this.flags.leader) {
      await agent.monitorEpochs();
    }

    this.log('Agent started... (ctrl-c to exit)');
  }
}
