//
// Copyright 2022 DXOS.org
//

import { FLAG_SPACE_KEYS } from '@dxos/cli-base';

import { BaseCommand } from '../../../base';

export default class List extends BaseCommand<typeof List> {
  static {
    this.description = 'List schema.';
    // TODO(burdon): Is this typesafe?
    this.flags = {
      ...BaseCommand.flags,
      ...FLAG_SPACE_KEYS,
    };
  }

  async run(): Promise<any> {
    const { space: spaceKeys } = this.flags;
    return await this.execWithSpace(
      async ({ space }) => {
        console.log(space.key.truncate());
      },
      { spaceKeys },
    );
  }
}
