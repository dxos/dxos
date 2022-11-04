//
// Copyright 2022 DXOS.org
//

import { BaseCommand } from '../../base-command';
import List from './list';

export default class Space extends BaseCommand {
  static override description = 'List spaces.';

  async run(): Promise<void> {
    return List.run([]);
  }
}
