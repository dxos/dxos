//
// Copyright 2022 DXOS.org
//

import { BaseCommand } from '../base';

export default class Config extends BaseCommand {
  static description = 'Config management';

  async run (): Promise<void> {
    console.log(this.userConfig);
  }
}
