//
// Copyright 2023 DXOS.org
//

import { Flags } from '@oclif/core';
import chalk from 'chalk';

import { AgentOptions, Agent, EchoProxyServer, EpochMonitor } from '@dxos/agent';
import { DX_RUNTIME } from '@dxos/client-protocol';

import { BaseCommand } from '../../base-command';

export default class Start extends BaseCommand<typeof Start> {
  static override enableJsonFlag = true;
  static override description = 'Starts the agent.';

  static override flags = {
    ...BaseCommand.flags,
    foreground: Flags.boolean({
      char: 'f',
      description: 'Run in foreground.',
      default: false,
    }),
    'web-socket': Flags.integer({
      description: 'Expose web socket port.',
      helpValue: 'port',
      aliases: ['ws'],
    }),
    echo: Flags.integer({
      description: 'Expose ECHO REST API.',
      helpValue: 'port',
    }),
    monitor: Flags.boolean({
      description: 'Run epoch monitoring.',
    }),
  };

  async run(): Promise<any> {
    if (this.flags.foreground) {
      const options: AgentOptions = {
        profile: this.flags.profile,
        socket: `unix://${DX_RUNTIME}/profile/${this.flags.profile}/agent.sock`,
        webSocket: this.flags['web-socket'],
      };

      const agent = new Agent(this.clientConfig, options);
      await agent.start();

      // ECHO API.
      if (this.flags['echo-proxy']) {
        agent.addPlugin(new EchoProxyServer({ port: this.flags['echo-proxy'] }));
      }

      // Epoch monitoring.
      if (this.flags.monitor) {
        agent.addPlugin(new EpochMonitor());
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
    } else {
      return await this.execWithDaemon(async (daemon) => {
        if (await daemon.isRunning(this.flags.profile)) {
          this.log(chalk`{red Warning}: ${this.flags.profile} is already running (Maybe run 'dx reset')`);
        }

        await daemon.start(this.flags.profile);
        this.log('Agent started');
      });
    }
  }
}
