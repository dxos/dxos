//
// Copyright 2023 DXOS.org
//

import { Flags } from '@oclif/core';

import { Agent } from '@dxos/agent';
import { DX_RUNTIME } from '@dxos/client-protocol';

import { BaseCommand } from '../../base-command';
import { safeParseInt } from '../../util';

export default class Run extends BaseCommand<typeof Run> {
  static override enableJsonFlag = true;
  static override description = 'Run agent as foreground process.';

  static override flags = {
    ...BaseCommand.flags,
    socket: Flags.boolean({
      description: 'Expose socket.',
      default: true,
    }),
    'web-socket': Flags.integer({
      description: 'Expose web socket port.',
      aliases: ['ws'],
    }),
    http: Flags.integer({
      description: 'Expose HTTP proxy.',
    }),
    epoch: Flags.string({
      description: 'Manage epochs (set to "auto" or message count).',
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

    const agent = new Agent(this.clientConfig, { profile: this.flags.profile, listen });
    await agent.start();

    if (this.flags.epoch && this.flags.epoch !== '0') {
      const limit = safeParseInt(this.flags.epoch, undefined);
      await agent.monitorEpochs({ limit });
    }

    // NOTE: This is currently called by the agent's forever daemon.
    this.log('Agent started... (ctrl-c to exit)');
    process.on('SIGINT', async () => {
      await agent.stop();
      process.exit(0);
    });

    if (this.flags['web-socket']) {
      this.log(`Open devtools: https://devtools.dxos.org?target=ws://localhost:${this.flags['web-socket']}`);
    }
  }
}
