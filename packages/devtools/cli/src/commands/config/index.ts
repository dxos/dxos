//
// Copyright 2022 DXOS.org
//

import { BaseCommand } from '../../base-command';

export default class Config extends BaseCommand<typeof Config> {
  static override enableJsonFlag = true;
  static override description = 'Show config file.';

  async run(): Promise<any> {
    const { config: configFile } = this.flags;
    if (this.flags.verbose) {
      this.log(`Config file: ${configFile}\n${JSON.stringify(this.clientConfig?.values, undefined, 2)}`);
    }

    return this.clientConfig?.values;
  }
}
