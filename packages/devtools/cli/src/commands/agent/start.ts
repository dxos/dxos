//
// Copyright 2023 DXOS.org
//

import { Flags } from '@oclif/core';
import chalk from 'chalk';

import { AgentOptions, Agent, EchoProxyServer, EpochMonitor } from '@dxos/agent';
import { runInContext, scheduleTaskInterval } from '@dxos/async';
import { DX_RUNTIME } from '@dxos/client-protocol';
import { Context } from '@dxos/context';
import * as Telemetry from '@dxos/telemetry';

import { BaseCommand } from '../../base-command';

export default class Start extends BaseCommand<typeof Start> {
  private readonly _ctx = new Context();
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
      // NOTE: Called by the agent's forever daemon.
      await this._runInForeground();
    } else {
      await this._runAsDaemon();
    }
  }

  private async _runInForeground() {
    const options: AgentOptions = {
      profile: this.flags.profile,
      socket: `unix://${DX_RUNTIME}/profile/${this.flags.profile}/agent.sock`,
      webSocket: this.flags['web-socket'],
    };

    const agent = new Agent(this.clientConfig, options);

    // ECHO API.
    if (this.flags['echo-proxy']) {
      agent.addPlugin(new EchoProxyServer({ port: this.flags['echo-proxy'] }));
    }

    // Epoch monitoring.
    if (this.flags.monitor) {
      agent.addPlugin(new EpochMonitor());
    }

    await agent.start();
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
        this.log(chalk`{red Warning}: '${this.flags.profile}' is already running.`);
        return;
      }

      try {
        await daemon.start(this.flags.profile);
        this.log('Agent started.');
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
