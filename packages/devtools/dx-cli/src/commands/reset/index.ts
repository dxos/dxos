//
// Copyright 2022 DXOS.org
//

import fs from 'fs';

import { BaseCommand } from '../../base-command.js';

export default class Reset extends BaseCommand {
  static override description = 'Reset all data.';

  async run (): Promise<any> {
    // TODO(burdon): Warning prompt.
    const path = this.clientConfig?.runtime?.client?.storage?.path;
    if (path) {
      fs.rmSync(path, { recursive: true });
      this.ok();
    }
  }
}
