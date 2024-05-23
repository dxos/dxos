//
// Copyright 2023 DXOS.org
//

import { ux } from '@oclif/core';

import { type Client } from '@dxos/client';
import { getTypename } from '@dxos/echo-schema';

import { ARG_SPACE_KEYS, BaseCommand } from '../../base';

export default class Query extends BaseCommand<typeof Query> {
  static override enableJsonFlag = true;
  static override description = 'Query database.';

  static override args = ARG_SPACE_KEYS;

  async run(): Promise<any> {
    return await this.execWithClient(async (client: Client) => {
      const space = await this.getSpace(client, this.args.key);
      const { objects } = await space.db.query().run();
      this.log('Objects:', objects.length);
      printObjects(objects);
      return { objects };
    });
  }
}

const printObjects = (objects: any[]) => {
  ux.table(objects, {
    id: {
      header: 'id',
      get: (row) => row.id.slice(0, 8),
    },
    type: {
      header: 'type',
      get: (row) => getTypename(row),
    },
  });
};
