//
// Copyright 2022 DXOS.org
//

import { Command, Config, Flags } from '@oclif/core';
import assert from 'assert';
import chalk from 'chalk';
import debug from 'debug';
import * as fs from 'fs-extra';
import yaml from 'js-yaml';
import * as path from 'path';

import { sleep } from '@dxos/async';
import { Client } from '@dxos/client';
import { ConfigProto } from '@dxos/config';
import * as Sentry from '@dxos/sentry';
import * as Telemetry from '@dxos/telemetry';

import { getTelemetryContext, PublisherRpcPeer, SENTRY_DESTINATION, TelemetryContext, TELEMETRY_API_KEY } from './util';

const log = debug('dxos:cli:main');

const ENV_DX_CONFIG = 'DX_CONFIG';

export abstract class BaseCommand extends Command {
  private _clientConfig?: ConfigProto;
  private _client?: Client;
  private _startTime: Date;
  protected _telemetryContext?: TelemetryContext;

  static override flags = {
    config: Flags.string({
      env: ENV_DX_CONFIG,
      description: 'Specify config file',
      default: async (context: any) => {
        return path.join(context.config.configDir, 'config.yml');
      }
    }),

    timeout: Flags.integer({
      description: 'Timeout in seconds',
      default: 30
    })
  };

  constructor(argv: string[], config: Config) {
    super(argv, config);

    this._startTime = new Date();
  }

  flags: any;

  get clientConfig() {
    return this._clientConfig;
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
    const { installationId, isInternalUser, fullCrashReports, disableTelemetry, environment, release } =
      this._telemetryContext;

    if (isInternalUser) {
      this.log(chalk`{bgMagenta You're using the CLI as an internal user} ✨\n`);
    }

    if (SENTRY_DESTINATION && !disableTelemetry) {
      Sentry.init({
        installationId,
        destination: SENTRY_DESTINATION,
        environment,
        release,
        // TODO(wittjosiah): Configure this.
        sampleRate: 1.0,
        scrubFilenames: !fullCrashReports,
        properties: {
          isInternalUser
        }
      });
    }

    if (TELEMETRY_API_KEY) {
      Telemetry.init({
        apiKey: TELEMETRY_API_KEY,
        batchSize: 20,
        enable: Boolean(TELEMETRY_API_KEY) && !disableTelemetry
      });
    }

    this.addToTelemetryContext({ command: this.id });

    Telemetry.event({
      installationId,
      name: 'dx-cli:command:start',
      properties: {
        ...this._telemetryContext
      }
    });

    // Load user config file.
    const { flags } = await this.parse(this.constructor as any);
    const { config: configFile } = flags as any;
    if (fs.existsSync(configFile)) {
      try {
        this._clientConfig = yaml.load(String(fs.readFileSync(configFile))) as ConfigProto;
      } catch (err) {
        Sentry.captureException(err);
        console.error(`Invalid config file: ${configFile}`);
      }
    } else {
      if (configFile) {
        console.error(`Config file not found: ${configFile}`);
      } else {
        console.error(`Set config via ${ENV_DX_CONFIG} env variable or config flag.`);
      }

      process.exit(1);
    }
  }

  override async catch(err: Error) {
    Sentry.captureException(err);
    this.error(err);
  }

  // Called after each run.
  override async finally() {
    const endTime = new Date();

    Telemetry.event({
      installationId: this._telemetryContext?.installationId,
      name: 'dx-cli:command:finish',
      properties: {
        ...this._telemetryContext,
        duration: endTime.getTime() - this._startTime.getTime()
      }
    });
  }

  /**
   * Lazily create the client.
   */
  async getClient() {
    assert(this._clientConfig);
    if (!this._client) {
      log('Creating client...');
      this._client = new Client(this._clientConfig);
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
      log('Destroyed');

      // TODO(burdon): Ends with abort signal without sleep (threads still open?)
      await sleep(3_000);
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

      const wsEndpoint = this._clientConfig?.runtime?.services?.publisher?.server;
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

  addToTelemetryContext(values: object) {
    if (!this._telemetryContext) {
      return;
    }

    this._telemetryContext = {
      ...this._telemetryContext,
      ...values
    };
  }
}
