//
// Copyright 2022 DXOS.org
//

import { Command, Flags } from '@oclif/core';
import * as fs from 'fs-extra';
import yaml from 'js-yaml';
import * as path from 'path';

export abstract class BaseCommand extends Command {
  protected userConfig?: string; // TODO(burdon): Protobuf type.

  // TODO(burdon): Support prefix options? (i.e., before topic command?)
  static globalFlags = {
    config: Flags.string({
      char: 'c',
      env: 'DX_CONFIG',
      description: 'Specify config file',
      default: async (context: any) => {
        return path.join(context.config.configDir, 'config.json');
      }
    })
  };

  static flags = {}; // Required.

  async init (): Promise<void> {
    // Load user config file.
    const { flags } = await this.parse(BaseCommand);
    const { config: configFile } = flags;
    if (fs.existsSync(configFile)) {
      this.userConfig = yaml.load(String(fs.readFileSync(configFile))) as any;
    }
  }
}
