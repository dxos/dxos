//
// Copyright 2023 DXOS.org
//

import { Flags } from '@oclif/core';
import chalk from 'chalk';
import { rmSync } from 'node:fs';

import { Agent, EchoProxyServer, EpochMonitor, FunctionsPlugin, parseAddress } from '@dxos/agent';
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
    const socket = `unix://${DX_RUNTIME}/profile/${this.flags.profile}/agent.sock`;
    {
      // Clear out old socket file.
      const { path } = parseAddress(socket);
      rmSync(path, { force: true });
    }

    const agent = new Agent({
      config: this.clientConfig,
      profile: this.flags.profile,
      protocol: {
        socket,
        webSocket: this.flags['web-socket'],
      },
      plugins: [
        // Epoch monitoring.
        // TODO(burdon): Config.
        this.flags.monitor && new EpochMonitor(),

        // ECHO API.
        // TODO(burdon): Config.
        this.flags['echo-proxy'] && new EchoProxyServer({ port: this.flags['echo-proxy'] }),

        // Functions.
        this.clientConfig.values.runtime?.agent?.functions &&
          new FunctionsPlugin({
            port: this.clientConfig.values.runtime?.agent?.functions?.port,
          }),
      ],
    });

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

      const process = await daemon.start(this.flags.profile, { config: this.flags.config });
      if (process) {
        this.log('Agent started.');
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
          duration: this.duration,
        },
      });
    };
    runInContext(this._ctx, sendTelemetry);
    scheduleTaskInterval(this._ctx, sendTelemetry, 1000 * 60);
  }
}
