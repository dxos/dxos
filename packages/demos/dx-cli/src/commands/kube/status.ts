//
// Copyright 2022 DXOS.org
//

import { BaseCommand } from '../../base-command';

export default class Status extends BaseCommand {
  static enableJsonFlag = true;
  static description = 'Get KUBE status';
  static flags = {}; // Required.

  async run (): Promise<{ status: number }> {
    const status = 200;
    this.log('Status:', status);
    return { status: 200 };
  }
}
