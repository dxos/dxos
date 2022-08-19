//
// Copyright 2022 DXOS.org
//

import { Command, Flags } from '@oclif/core';
import assert from 'assert';
import debug from 'debug';
import * as fs from 'fs-extra';
import yaml from 'js-yaml';
import * as path from 'path';

import { Client } from '@dxos/client/client';
import { ConfigObject } from '@dxos/config';

const log = debug('dxos:cli:main');
const error = log.extend('error');

const ENV_DX_CONFIG = 'DX_CONFIG';

export abstract class BaseCommand extends Command {
  private _clientConfig?: ConfigObject;
  private _client?: Client;

  static override flags = {
    config: Flags.string({
      env: ENV_DX_CONFIG,
      description: 'Specify config file',
      default: async (context: any) => {
        return path.join(context.config.configDir, 'config.json');
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

    // Load user config file.
    const { flags } = await this.parse(this.constructor as any);
    const { config: configFile } = flags as any;
    if (fs.existsSync(configFile)) {
      try {
        this._clientConfig = yaml.load(String(fs.readFileSync(configFile))) as ConfigObject;
      } catch (err) {
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
    error(err);
    // process.exit(1);
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
      return value;
    } catch (err: any) {
      this.error(err);
    }
  }
}
