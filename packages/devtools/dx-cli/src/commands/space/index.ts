//
// Copyright 2022 DXOS.org
//

import { BaseCommand } from '../../base-command.js';
import List from './list.js';

export default class Space extends BaseCommand {
  static override description = 'List spaces.';

  async run (): Promise<void> {
    return List.run([]);
  }
}
