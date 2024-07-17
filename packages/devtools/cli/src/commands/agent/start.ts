//
// Copyright 2023 DXOS.org
//

import { Flags } from '@oclif/core';
import chalk from 'chalk';
import { rmSync } from 'node:fs';

import {
  Agent,
  type AgentHttpParams,
  ChainPlugin,
  DashboardPlugin,
  DiscordPlugin,
  EchoProxyPlugin,
  EpochMonitorPlugin,
  FunctionsPlugin,
  QueryPlugin,
  parseAddress,
} from '@dxos/agent';
import { asyncTimeout, runInContext, scheduleTaskInterval, Trigger } from '@dxos/async';
import { AgentAlreadyRunningError } from '@dxos/cli-base';
import { DX_RUNTIME, getProfilePath } from '@dxos/client-protocol';
import { Context } from '@dxos/context';
import { type Platform } from '@dxos/protocols/proto/dxos/client/services';

import { BaseCommand } from '../../base';

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
    http: Flags.integer({
      description: 'Expose http port.',
      helpValue: 'port',
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

    let httpParams: AgentHttpParams | undefined;
    if (this.flags.http) {
      if (!process.env.DX_AGENT_HTTP_AUTHENTICATION_TOKEN || !process.env.DX_AGENT_WS_AUTHENTICATION_TOKEN) {
        this.log(
          'DX_AGENT_HTTP_AUTHENTICATION_TOKEN or DX_AGENT_WS_AUTHENTICATION_TOKEN not set, http server will not be started.',
        );
      } else {
        httpParams = {
          port: this.flags.http,
          authenticationToken: process.env.DX_AGENT_HTTP_AUTHENTICATION_TOKEN,
          wsAuthenticationToken: process.env.DX_AGENT_WS_AUTHENTICATION_TOKEN,
        };
      }
    }

    this._agent = new Agent({
      config: this.clientConfig,
      profile: this.flags.profile,
      metrics: this.flags.metrics,
      protocol: {
        socketPath: socket,
        webSocket: this.flags.ws,
        ...(httpParams ? { http: httpParams } : {}),
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

    const started = new Trigger();
    let gracefulStopRequested: boolean;
    const gracefulStopComplete = new Trigger();

    const gracefulStop = (processSignal: string) => {
      return async () => {
        // Note: using this.{errors,warn,catch} in a signal handler will not cause the process to exit.
        if (gracefulStopRequested) {
          this.log('multiple graceful stop requests received, exiting immediately.');
          process.exit(5);
        }

        gracefulStopRequested = true;

        // wait for agent to finish starting before asking it to stop.
        asyncTimeout(started.wait(), 5_000, 'Agent start timeout').catch((err) => {
          this.log('agent never started, exiting.', err);
          process.exit(4);
        });

        if (!this._agent) {
          this.log('agent never started, exiting.');
          process.exit(3);
        }

        this.log(`${processSignal} received, shutting down agent.`);
        await Promise.all([
          asyncTimeout(this._ctx.dispose(), 1_000, 'Waiting for agent support to shutdown.'),
          asyncTimeout(this._agent.stop(), 5_000, 'Agent stop'),
        ]).catch((err) => {
          this.log('error in graceful shutdown: ', err);
          process.exit(1);
        });

        this.log('done stopping, exiting.');
        gracefulStopComplete.wake();
      };
    };

    process.on('SIGINT', gracefulStop('SIGINT'));
    process.on('SIGTERM', gracefulStop('SIGTERM'));

    // TODO(nf): Handle SIGHUP/etc.

    try {
      await this._agent.start();
    } catch (err: any) {
      if (err?.code === 'EAGAIN') {
        throw new AgentAlreadyRunningError();
      }
      throw err;
    }

    this.log('Agent started... (ctrl-c to exit)');

    await this._sendTelemetry();
    const platform = (await this._agent.client!.services.services.SystemService?.getPlatform()) as Platform;
    if (!platform) {
      this.log('failed to get platform, could not initialize observability');
    } else {
      if (this._observability?.enabled) {
        await this._observability.initialize();
        await this._observability.setIdentityTags(this._agent.client!.services.services);
        await this._observability.startNetworkMetrics(this._agent.client!.services.services);
        await this._observability.startSpacesMetrics(this._agent.client!, 'cli');
        await this._observability.startRuntimeMetrics(this._agent.client!);
        // initAgentMetrics(this._ctx, this._observability, this._startTime);
        // initClientMetrics(this._ctx, this._observability, this._agent!);
      }
    }

    if (this.flags.ws) {
      this.log(`Open devtools: https://devtools.dxos.org?target=ws://localhost:${this.flags.ws}`);
    }
    started.wake();
    await gracefulStopComplete.wait();
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
        this.catch(err);
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
