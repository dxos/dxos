//
// Copyright 2022 DXOS.org
//

import { Command, Flags } from '@oclif/core';
import assert from 'assert';
import debug from 'debug';
import * as fs from 'fs-extra';
import yaml from 'js-yaml';
import * as path from 'path';

import { sleep } from '@dxos/async';
import { Client } from '@dxos/client';
import { ConfigProto } from '@dxos/config';
import * as Sentry from '@dxos/sentry';
import * as Telemetry from '@dxos/telemetry';

import { getTelemetryApiKey, getTelemetryContext, PublisherRpcPeer } from './util';

const log = debug('dxos:cli:main');

const ENV_DX_CONFIG = 'DX_CONFIG';
const SENTRY_DESTINATION = 'https://2647916221e643869965e78469479aa4@o4504012000067584.ingest.sentry.io/4504012027265029';

export abstract class BaseCommand extends Command {
  private _clientConfig?: ConfigProto;
  private _client?: Client;

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

  flags: any;

  get clientConfig () {
    return this._clientConfig;
  }

  ok () {
    this.log('ok');
  }

  /**
   * Load the client config.
   */
  override async init (): Promise<void> {
    await super.init();

    const {
      machineId,
      identityId,
      fullCrashReports,
      disableTelemetry
    } = await getTelemetryContext(this.config.configDir);

    if (!disableTelemetry) {
      Sentry.init({
        machineId,
        destination: process.env.SENTRY_DSN ?? SENTRY_DESTINATION,
        // TODO(wittjosiah): Configure this.
        sampleRate: 1.0,
        scrubFilenames: !fullCrashReports
      });
    }

    Telemetry.init({
      apiKey: getTelemetryApiKey(),
      batchSize: 20,
      enable: !disableTelemetry
    });

    Telemetry.event({
      machineId,
      identityId,
      name: this.id ?? 'unknown'
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

  override async catch (err: Error) {
    Sentry.captureException(err);
    this.error(err);
  }

  // Called after each run.
  override async finally () {}

  /**
   * Lazily create the client.
   */
  async getClient () {
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
  async execWithClient <T> (callback: (client: Client) => Promise<T | undefined>): Promise<T | undefined> {
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
  async execWithPublisher <T> (callback: (rpc: PublisherRpcPeer) => Promise<T | undefined>): Promise<T | undefined> {
    let rpc: PublisherRpcPeer | undefined;
    try {
      assert(this._clientConfig);

      const wsEndpoint = this._clientConfig?.runtime?.services?.publisher?.server;
      assert(wsEndpoint);

      rpc = new PublisherRpcPeer(wsEndpoint);

      await Promise.race([
        rpc.connected.waitForCount(1),
        rpc.error.waitForCount(1).then(err => Promise.reject(err))
      ]);

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
}
