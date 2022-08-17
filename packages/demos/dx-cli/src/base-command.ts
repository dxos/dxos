//
// Copyright 2022 DXOS.org
//

import { Command, Flags } from '@oclif/core';
import assert from 'assert';
import * as fs from 'fs-extra';
import yaml from 'js-yaml';
import * as path from 'path';

import { Client } from '@dxos/client';
import { ConfigObject } from '@dxos/config';

const ENV_DX_CONFIG = 'DX_CONFIG';

export abstract class BaseCommand extends Command {
  private _clientConfig?: ConfigObject;
  private _client?: Client;

  static override globalFlags = {
    config: Flags.string({
      env: ENV_DX_CONFIG,
      description: 'Specify config file',
      helpGroup: 'GLOBAL',
      default: async (context: any) => {
        return path.join(context.config.configDir, 'config.json');
      }
    })
  };

  get clientConfig () {
    return this._clientConfig;
  }

  /**
   * Load the client config.
   */
  override async init (): Promise<void> {
    await super.init();

    // Load user config file.
    const { flags } = await this.parse();
    const { config: configFile } = flags as any;
    if (fs.existsSync(configFile)) {
      this._clientConfig = yaml.load(String(fs.readFileSync(configFile))) as ConfigObject;
    } else {
      console.error(`Set config via ${ENV_DX_CONFIG} env variable or config flag.`);
      process.exit(1);
    }
  }

  /**
   * Lazily create the client.
   */
  async getClient () {
    assert(this._clientConfig);
    if (!this._client) {
      this._client = new Client(this._clientConfig);
      await this._client.initialize();
    }

    return this._client;
  }

  /**
   * Convenience function to wrap command passing in client object.
   */
  // TODO(burdon): Error handling.
  async execWithClient <T> (callback: (client: Client) => Promise<T | undefined>): Promise<T | undefined> {
    const client = await this.getClient();
    const value = await callback(client);
    await client.destroy();
    return value;
  }
}
