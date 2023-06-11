//
// Copyright 2022 DXOS.org
//

import { Command, Config as OclifConfig, Flags } from '@oclif/core';
import chalk from 'chalk';
import yaml from 'js-yaml';
import fetch from 'node-fetch';
import assert from 'node:assert';
import fs from 'node:fs';
import { readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import pkgUp from 'pkg-up';

import { Client, fromAgent, Config } from '@dxos/client';
import { ENV_DX_CONFIG, ENV_DX_PROFILE, ENV_DX_PROFILE_DEFAULT } from '@dxos/client-protocol';
import { ConfigProto } from '@dxos/config';
import { raise } from '@dxos/debug';
import { log } from '@dxos/log';
import * as Sentry from '@dxos/sentry';
import { captureException } from '@dxos/sentry';
import * as Telemetry from '@dxos/telemetry';

import { Agent } from './agent';
import { ForeverDaemon } from './agent/forever';
import {
  IPDATA_API_KEY,
  SENTRY_DESTINATION,
  TELEMETRY_API_KEY,
  disableTelemetry,
  getTelemetryContext,
  PublisherRpcPeer,
  SupervisorRpcPeer,
  TelemetryContext,
  TunnelRpcPeer,
} from './util';

// TODO(wittjosiah): Factor out.
const exists = async (...args: string[]): Promise<boolean> => {
  try {
    const result = await stat(join(...args));
    return !!result;
  } catch (err: any) {
    if (/ENOENT/.test(err.message)) {
      return false;
    } else {
      throw err;
    }
  }
};

export abstract class BaseCommand extends Command {
  private _clientConfig?: Config;
  private _client?: Client;
  private _startTime: Date;
  private _failing = false;
  private readonly _stdin?: string;

  protected _telemetryContext?: TelemetryContext;

  public static override enableJsonFlag = true;

  static override flags = {
    profile: Flags.string({
      description: 'User profile',
      default: ENV_DX_PROFILE_DEFAULT,
      env: ENV_DX_PROFILE,
    }),

    config: Flags.string({
      env: ENV_DX_CONFIG,
      description: 'Specify config file',
      // TODO(burdon): Factor out.
      default: async (context: any) => {
        const profile = context?.flags?.profile ?? ENV_DX_PROFILE_DEFAULT;
        console.log('>>>>>>>>>', profile, process.env[ENV_DX_PROFILE]);
        console.log('<<<<', context);
        return join((context.config as OclifConfig).configDir, `profile/${profile}.yml`);
      },
      dependsOn: ['profile'],
      aliases: ['c'],
    }),

    timeout: Flags.integer({
      description: 'Timeout in seconds',
      default: 30,
      aliases: ['t'],
    }),

    // TODO(mykola): Implement JSON args.
  };

  constructor(argv: string[], config: OclifConfig) {
    super(argv, config);

    try {
      this._stdin = fs.readFileSync(0, 'utf8');
    } catch (err) {
      this._stdin = undefined;
    }

    this._startTime = new Date();
  }

  get clientConfig() {
    return this._clientConfig;
  }

  get stdin() {
    return this._stdin;
  }

  ok() {
    this.log('ok');
  }

  /**
   * Load the client config.
   */
  override async init(): Promise<void> {
    await super.init();

    this._telemetryContext = await getTelemetryContext(this.config.configDir);
    const { mode, installationId, group, environment, release } = this._telemetryContext;

    if (group === 'dxos') {
      this.log(chalk`✨ {bgMagenta You're using the CLI as an internal user} ✨\n`);
    }

    if (SENTRY_DESTINATION && mode !== 'disabled') {
      Sentry.init({
        installationId,
        destination: SENTRY_DESTINATION,
        environment,
        release,
        // TODO(wittjosiah): Configure this.
        sampleRate: 1.0,
        scrubFilenames: mode !== 'full',
        properties: {
          group,
        },
      });
    }

    if (TELEMETRY_API_KEY) {
      mode === 'disabled' && (await disableTelemetry(this.config.configDir));

      Telemetry.init({
        apiKey: TELEMETRY_API_KEY,
        batchSize: 20,
        enable: Boolean(TELEMETRY_API_KEY) && mode !== 'disabled',
      });
    }

    this.addToTelemetryContext({ command: this.id });

    setTimeout(async () => {
      try {
        const res = await fetch(`https://api.ipdata.co/?api-key=${IPDATA_API_KEY}`);
        const data = await res.json();
        const { city, region, country, latitude, longitude } = data;
        this.addToTelemetryContext({ city, region, country, latitude, longitude });
      } catch (err) {
        captureException(err);
      }
    });

    // Load user config file.
    await this._loadConfig();
  }

  private async _loadConfig() {
    const { flags } = await this.parse(this.constructor as any);
    const { config: configFile } = flags;

    try {
      const configExists = await exists(configFile);
      if (!configExists) {
        const defaultConfigPath = join(
          dirname(pkgUp.sync({ cwd: __dirname }) ?? raise(new Error('Could not find package.json'))),
          'config/config-default.yml',
        );

        const yamlConfig = yaml.load(await readFile(defaultConfigPath, 'utf-8')) as ConfigProto;
        if (yamlConfig.runtime?.client?.storage?.path) {
          // Isolate DX_PROFILE storages.
          yamlConfig.runtime.client.storage.path = join(yamlConfig.runtime.client.storage.path, flags.profile);
        }

        await writeFile(configFile, yaml.dump(yamlConfig), 'utf-8');
      }

      this._clientConfig = new Config(yaml.load(await readFile(configFile, 'utf-8')) as ConfigProto);
    } catch (err) {
      Sentry.captureException(err);
      log.error(`Invalid config file: ${configFile}`, err);
      process.exit(1);
    }
  }

  override async catch(err: Error) {
    this._failing = true;
    Sentry.captureException(err);
    this.error(err);
  }

  // Called after each run.
  override async finally() {
    const endTime = new Date();

    Telemetry.event({
      installationId: this._telemetryContext?.installationId,
      name: 'cli.command.run',
      properties: {
        ...this._telemetryContext,
        status: this._failing ? 'failure' : 'success',
        duration: endTime.getTime() - this._startTime.getTime(),
      },
    });
  }

  /**
   * Lazily create the client.
   */
  async getClient() {
    const { flags } = await this.parse(this.constructor as any);
    await this.execWithDaemon(async (daemon) => {
      if (!(await daemon.isRunning(flags.profile))) {
        await daemon.start(flags.profile);
      }
    });

    assert(this._clientConfig);
    if (!this._client) {
      log('Creating client...');
      this._client = new Client({ config: this._clientConfig, services: fromAgent(flags.profile) });
      await this._client.initialize();
      log('Initialized');
    }

    return this._client;
  }

  /**
   * Convenience function to wrap command passing in client object.
   */
  async execWithClient<T>(callback: (client: Client) => Promise<T | undefined>): Promise<T | undefined> {
    try {
      const client = await this.getClient();
      const value = await callback(client);
      log('Destroying...');
      await client.destroy();

      log('Done');
      return value;
    } catch (err: any) {
      Sentry.captureException(err);
      this.error(err);
    }
  }

  async execWithDaemon<T>(callback: (agent: Agent) => Promise<T | undefined>): Promise<T | undefined> {
    try {
      const daemon = new ForeverDaemon();
      await daemon.connect();
      const value = await callback(daemon);
      log('Disconnecting...');
      await daemon.disconnect();

      log('Done');
      return value;
    } catch (err: any) {
      Sentry.captureException(err);
      this.error(err);
    }
  }

  /**
   * Convenience function to wrap command passing in kube publisher.
   */
  async execWithPublisher<T>(callback: (rpc: PublisherRpcPeer) => Promise<T | undefined>): Promise<T | undefined> {
    let rpc: PublisherRpcPeer | undefined;
    try {
      assert(this._clientConfig);

      const wsEndpoint = this._clientConfig.get('runtime.services.publisher.server');
      assert(wsEndpoint);

      rpc = new PublisherRpcPeer(wsEndpoint);
      await Promise.race([rpc.connected.waitForCount(1), rpc.error.waitForCount(1).then((err) => Promise.reject(err))]);

      const value = await callback(rpc);
      return value;
    } catch (err: any) {
      Sentry.captureException(err);
      this.error(err);
    } finally {
      if (rpc) {
        await rpc.close();
      }
    }
  }

  async execWithTunneling<T>(callback: (rpc: TunnelRpcPeer) => Promise<T | undefined>): Promise<T | undefined> {
    let rpc: TunnelRpcPeer | undefined;
    try {
      assert(this._clientConfig);

      const wsEndpoint = this._clientConfig.get('runtime.services.tunneling.server');
      assert(wsEndpoint);

      rpc = new TunnelRpcPeer(wsEndpoint);
      await Promise.race([rpc.connected.waitForCount(1), rpc.error.waitForCount(1).then((err) => Promise.reject(err))]);

      const value = await callback(rpc);
      return value;
    } catch (err: any) {
      Sentry.captureException(err);
      this.error(err);
    } finally {
      if (rpc) {
        await rpc.close();
      }
    }
  }

  async execWithSupervisor<T>(callback: (rpc: SupervisorRpcPeer) => Promise<T | undefined>): Promise<T | undefined> {
    let rpc: SupervisorRpcPeer | undefined;
    try {
      assert(this._clientConfig);

      const wsEndpoint = this._clientConfig.get('runtime.services.supervisor.server');
      assert(wsEndpoint);

      rpc = new SupervisorRpcPeer(wsEndpoint);
      await Promise.race([rpc.connected.waitForCount(1), rpc.error.waitForCount(1).then((err) => Promise.reject(err))]);

      const value = await callback(rpc);
      return value;
    } catch (err: any) {
      // TODO(egorgripasov): Move Sentry into this.error?
      Sentry.captureException(err);
      this.error(err);
    } finally {
      if (rpc) {
        await rpc.close();
      }
    }
  }

  addToTelemetryContext(values: object) {
    if (!this._telemetryContext) {
      return;
    }

    this._telemetryContext = {
      ...this._telemetryContext,
      ...values,
    };
  }
}
