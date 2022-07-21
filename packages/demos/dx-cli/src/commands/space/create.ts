//
// Copyright 2022 DXOS.org
//

import { BaseCommand } from '../../base-command';

export default class Create extends BaseCommand {
  static override description = 'Create spaces.';
  static override flags = {}; // Required.

  async run (): Promise<void> {}
}
