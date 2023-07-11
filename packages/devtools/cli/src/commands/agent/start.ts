//
// Copyright 2023 DXOS.org
//

import { Flags } from '@oclif/core';
import chalk from 'chalk';

import { AgentOptions, Agent } from '@dxos/agent';
import { DX_RUNTIME } from '@dxos/client-protocol';

import { BaseCommand } from '../../base-command';
import { safeParseInt } from '../../util';

export default class Start extends BaseCommand<typeof Start> {
  static override enableJsonFlag = true;
  static override description = 'Start agent daemon.';

  static override flags = {
    ...BaseCommand.flags,
    foreground: Flags.boolean({
      char: 'f',
      description: 'Run in foreground',
      default: false,
    }),
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
<<<<<<< HEAD
    return await this.execWithDaemon(async (daemon) => {
      const { flags } = await this.parse(Start);
      if (await daemon.isRunning(flags.profile)) {
        this.log(chalk`{red Warning}: ${flags.profile} is already running (Maybe run 'dx reset')`);
=======
    const { flags } = await this.parse(Start);

    if (flags.foreground) {
      const listen = [];
      if (this.flags.socket) {
        listen.push(`unix://${DX_RUNTIME}/profile/${this.flags.profile}/agent.sock`);
>>>>>>> 870d94856 (Delete `run` command)
      }
      if (this.flags['web-socket']) {
        listen.push(`ws://localhost:${this.flags['web-socket']}`);
      }
      if (this.flags.http) {
        listen.push(`http://localhost:${this.flags.http}`);
      }

      const options: AgentOptions = {
        profile: this.flags.profile,
        listen,
      };

      // TODO(burdon): Build monitoring into agent start (not just epoch).
      if (this.flags.epoch && this.flags.epoch !== '0') {
        options.monitor = {
          limit: safeParseInt(this.flags.epoch, undefined),
        };
      }

      const agent = new Agent(this.clientConfig, options);
      await agent.start();

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
        if (await daemon.isRunning(flags.profile)) {
          this.log(chalk`{red Warning}: ${flags.profile} is already running (Maybe run 'dx agent reset')`);
        }
        await daemon.start(this.flags.profile);
        this.log('Agent started');
      });
    }
  }
}
