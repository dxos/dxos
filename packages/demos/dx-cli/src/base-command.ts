//
// Copyright 2022 DXOS.org
//

import { Command, Flags } from '@oclif/core';
import * as fs from 'fs-extra';
import yaml from 'js-yaml';
import * as path from 'path';

export abstract class BaseCommand extends Command {
  protected userConfig = {}; // TODO(burdon): Protobuf type.

  static globalFlags = {
    config: Flags.string({
      env: 'DX_CONFIG',
      description: 'Specify config file',
      helpGroup: 'GLOBAL',
      default: async (context: any) => {
        return path.join(context.config.configDir, 'config.json');
      }
    })
  };

  async init (): Promise<void> {
    await super.init();

    // Load user config file.
    // TODO(burdon): Hack passing in undefined.
    //  [2022-07-18] https://github.com/oclif/core/issues/444
    const { flags } = await this.parse(undefined);
    const { config: configFile } = flags;
    if (fs.existsSync(configFile)) {
      this.userConfig = yaml.load(String(fs.readFileSync(configFile))) as any;
    }
  }
}
