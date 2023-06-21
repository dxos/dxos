//
// Copyright 2022 DXOS.org
//

import { BaseCommand } from '../../base-command';
import List from './list';

export default class Space extends BaseCommand<typeof Space> {
  static override description = 'List spaces.';

  async run(): Promise<void> {
    // TODO(burdon): Should this run by default?
    return List.run([]);
  }
}
