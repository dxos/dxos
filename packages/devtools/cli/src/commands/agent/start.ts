//
// Copyright 2023 DXOS.org
//

import { Flags } from '@oclif/core';
import chalk from 'chalk';

import { AgentOptions, Agent } from '@dxos/agent';
import { runInContext, scheduleTaskInterval } from '@dxos/async';
import { DX_RUNTIME } from '@dxos/client-protocol';
import { Context } from '@dxos/context';
import * as Telemetry from '@dxos/telemetry';

import { BaseCommand } from '../../base-command';
import { safeParseInt } from '../../util';

export default class Start extends BaseCommand<typeof Start> {
  private readonly _ctx = new Context();
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
    if (this.flags.foreground) {
      await this._runInForeground();
    } else {
      await this._runAsDaemon();
    }
  }

  private async _runInForeground() {
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
      void this._ctx.dispose();
      await agent.stop();
      process.exit(0);
    });

    this._sendTelemetry();

    if (this.flags['web-socket']) {
      this.log(`Open devtools: https://devtools.dxos.org?target=ws://localhost:${this.flags['web-socket']}`);
    }
  }

  private async _runAsDaemon() {
    return await this.execWithDaemon(async (daemon) => {
      if (await daemon.isRunning(this.flags.profile)) {
        this.log(chalk`{red Warning}: '${this.flags.profile}' is already running (Maybe run 'dx reset')`);
        return;
      }
      try {
        await daemon.start(this.flags.profile);
        this.log('Agent started');
      } catch (err) {
        this.log(chalk`{red Failed to start daemon}: ${err}`);
        await daemon.stop(this.flags.profile);
      }
    });
  }

  private _sendTelemetry() {
    const sendTelemetry = async () => {
      Telemetry.event({
        installationId: this._telemetryContext?.installationId,
        name: 'cli.command.run.agent',
        properties: {
          profile: this.flags.profile,
          ...this._telemetryContext,
          duration: Date.now() - this._startTime.getTime(),
        },
      });
    };
    runInContext(this._ctx, sendTelemetry);
    scheduleTaskInterval(this._ctx, sendTelemetry, 1000 * 60);
  }
}
