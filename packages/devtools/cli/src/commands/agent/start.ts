//
// Copyright 2023 DXOS.org
//

import { Flags } from '@oclif/core';
import chalk from 'chalk';
import { rmSync } from 'node:fs';

import {
  Agent,
  ChainPlugin,
  DashboardPlugin,
  DiscordPlugin,
  EchoProxyPlugin,
  EpochMonitorPlugin,
  FunctionsPlugin,
  QueryPlugin,
  parseAddress,
} from '@dxos/agent';
import { runInContext, scheduleTaskInterval } from '@dxos/async';
import { DX_RUNTIME, getProfilePath } from '@dxos/client-protocol';
import { Context } from '@dxos/context';
import * as Telemetry from '@dxos/telemetry';

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
    system: Flags.boolean({
      description: 'Run as system daemon.',
      default: false,
    }),
    ws: Flags.integer({
      description: 'Expose web socket port.',
      helpValue: 'port',
      aliases: ['web-socket'],
    }),
    metrics: Flags.boolean({
      description: 'Start metrics recording.',
    }),
  };

  static override examples = [
    {
      description: 'Run with .',
      command: 'dx agent start -f --ws=5001',
    },
  ];

  private readonly _ctx = new Context();

  async run(): Promise<any> {
    if (this.flags.foreground) {
      // NOTE: This is invoked by the agent's forever daemon.
      await this._runInForeground();
    } else {
      await this._runAsDaemon(this.flags.system);
    }
  }

  private async _runInForeground() {
    const socket = 'unix://' + getProfilePath(DX_RUNTIME, this.flags.profile, 'agent.sock');
    {
      // Clear out old socket file.
      const { path } = parseAddress(socket);
      rmSync(path, { force: true });
    }

    const agent = new Agent({
      config: this.clientConfig,
      profile: this.flags.profile,
      metrics: this.flags.metrics,
      protocol: {
        socket,
        webSocket: this.flags.ws,
      },
      plugins: [
        new ChainPlugin(),
        new DashboardPlugin(),
        new DiscordPlugin(),
        new EchoProxyPlugin(),
        new EpochMonitorPlugin(),
        new FunctionsPlugin(),
        new QueryPlugin(),
      ],
    });

    await agent.start();
    this.log('Agent started... (ctrl-c to exit)');

    this._sendTelemetry();

    if (this.flags.ws) {
      this.log(`Open devtools: https://devtools.dxos.org?target=ws://localhost:${this.flags.ws}`);
    }
  }

  private async _runAsDaemon(system: boolean) {
    return await this.execWithDaemon(async (daemon) => {
      if (await daemon.isRunning(this.flags.profile)) {
        this.log(chalk`{red Warning}: '${this.flags.profile}' is already running.`);
        return;
      }

      try {
        const process = await daemon.start(this.flags.profile, {
          config: this.flags.config,
          metrics: this.flags.metrics,
          ws: this.flags.ws,
          timeout: this.flags.timeout,
        });
        if (process) {
          this.log('Agent started.');
        }
      } catch (err: any) {
        this.error(err);
      }
    }, system);
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
