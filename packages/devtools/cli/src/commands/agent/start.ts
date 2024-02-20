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
import { type Platform } from '@dxos/protocols/proto/dxos/client/services';

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
  private _agent?: Agent;

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

    this._agent = new Agent({
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

    await this._agent.start();
    this.log('Agent started... (ctrl-c to exit)');

    await this._sendTelemetry();
    const platform = (await this._agent.client!.services.services.SystemService?.getPlatform()) as Platform;
    if (!platform) {
      this.log('failed to get platform, could not initialize observability');
      return undefined;
    }

    if (this._observability?.enabled) {
      this.log('Metrics initialized!');

      await this._observability.initialize();
      await this._observability.setIdentityTags(this._agent.client!);
      await this._observability.startNetworkMetrics(this._agent.client!);
      await this._observability.startSpacesMetrics(this._agent.client!, 'cli');
      await this._observability.startRuntimeMetrics(this._agent.client!);
      // initAgentMetrics(this._ctx, this._observability, this._startTime);
      //  initClientMetrics(this._ctx, this._observability, this._agent!);
    }

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

  private async _sendTelemetry() {
    const sendTelemetry = async () => {
      // TODO(nf): move to observability
      const installationId = this._observability?.getTag('installationId');
      const userId = this._observability?.getTag('identityKey');
      this._observability?.event({
        installationId: installationId?.value,
        identityId: userId?.value,
        name: 'cli.command.run.agent',
        properties: {
          profile: this.flags.profile,
          duration: this.duration,
        },
      });
    };

    runInContext(this._ctx, sendTelemetry);
    scheduleTaskInterval(this._ctx, sendTelemetry, 1000 * 60);
  }
}
