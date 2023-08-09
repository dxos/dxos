//
// Copyright 2022 DXOS.org
//

import { BaseCommand } from '../../base-command';

export default class Metrics extends BaseCommand<typeof Metrics> {
  static override description = 'Control metrics.';

  async run(): Promise<any> {}
}
