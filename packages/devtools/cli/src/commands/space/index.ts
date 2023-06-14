//
// Copyright 2022 DXOS.org
//

import List from './list';
import { BaseCommand } from '../../base-command';

export default class Space extends BaseCommand<typeof Space> {
  static override description = 'List spaces.';

  async run(): Promise<void> {
    // TODO(burdon): Should this run by default?
    return List.run([]);
  }
}
