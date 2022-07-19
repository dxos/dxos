//
// Copyright 2022 DXOS.org
//

import { BaseCommand } from '../../base-command';

export default class Config extends BaseCommand {
  static description = 'Show config file.';
  static enableJsonFlag = true;

  async run (): Promise<any> {
    this.log('Config:', this.userConfig);
    return this.userConfig;
  }
}
