//
// Copyright 2022 DXOS.org
//

import { Command, Flags } from '@oclif/core';
import * as fs from 'fs-extra';
import yaml from 'js-yaml';
import * as path from 'path';

export abstract class BaseCommand extends Command {
  protected userConfig?: string; // TODO(burdon): Protobuf type.

  // TODO(burdon): --json doesn't show up in help.
  // TODO(burdon): Support prefix options? (i.e., before command?)
  static _globalFlags = {
    config: Flags.string({
      env: 'DX_CONFIG',
      description: 'Specify config file',
      helpGroup: 'GLOBAL',
      default: async (context: any) => {
        return path.join(context.config.configDir, 'config.json');
      }
    })
  };

  // TODO(burdon): If not specified, global flags don't show up.
  static flags = {};

  async init (): Promise<void> {
    await super.init();

    // Load user config file.
    // TODO(burdon): Removes the --json flag.
    //  [2022-07-18] https://github.com/oclif/core/issues/444
    // console.log(Parser.parse(this.argv, { context: this }));
    const { flags } = { flags: { config: '' } };// await this.parse(BaseCommand);
    const { config: configFile } = flags;
    if (fs.existsSync(configFile)) {
      this.userConfig = yaml.load(String(fs.readFileSync(configFile))) as any;
    }
  }
}
