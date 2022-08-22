//
// Copyright 2022 DXOS.org
//

import { BaseCommand } from '../../base-command';

export default class Config extends BaseCommand {
  static override enableJsonFlag = true;
  static override description = 'Show config file.';

  async run (): Promise<any> {
    const { flags } = await this.parse(Config);
    const { config: configFile } = flags;
    this.log(`Config file: ${configFile}\n${JSON.stringify(this.clientConfig, undefined, 2)}`);
    return this.clientConfig;
  }
}
