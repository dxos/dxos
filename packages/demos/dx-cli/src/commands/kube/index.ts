//
// Copyright 2022 DXOS.org
//

import { BaseCommand } from '../../base-command';

export default class Kube extends BaseCommand {
  static description = 'Show KUBE status.';
  static flags = {}; // Required.

  async run (): Promise<void> {}
}
