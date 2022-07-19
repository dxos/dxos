//
// Copyright 2022 DXOS.org
//

import { BaseCommand } from '../base';

export default class Status extends BaseCommand {
  static description = 'Get KUBE status';
  static enableJsonFlag = true

  async run (): Promise<{ status: number }> {
    const status = 200;
    this.log('status:', status);
    return { status: 200 };
  }
}
