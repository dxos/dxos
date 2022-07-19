//
// Copyright 2022 DXOS.org
//

import { BaseCommand } from '../../base-command';

export default class Config extends BaseCommand {
  static enableJsonFlag = true;
  static description = 'Show config file.';
  static flags = {}; // Required.

  async run (): Promise<any> {
    this.log('Config:', this.userConfig);
    return this.userConfig;
  }
}
