//
// Copyright 2022 DXOS.org
//

import { ARG_SPACE_KEYS } from '@dxos/cli-base';

import { BaseCommand } from '../../base';

export default class Epoch extends BaseCommand<typeof Epoch> {
  static override enableJsonFlag = true;
  static override description = 'Create new epoch.';
  static override args = ARG_SPACE_KEYS;

  async run(): Promise<any> {
    const { key } = this.args;
    return await this.execWithClient(async ({ client }) => {
      const space = await this.getSpace(client, key);
      await space.internal.createEpoch();
    });
  }
}
