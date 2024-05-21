//
// Copyright 2024 DXOS.org
//

import { BaseCommand } from '../../base';

// TODO(burdon): Move to @dxos/cli-composer.

export default class Index extends BaseCommand {
  static override description = 'Composer commands';

  async run() {
    console.log('test');
  }
}
