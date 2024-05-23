//
// Copyright 2023 DXOS.org
//

import { ux } from '@oclif/core';

import { type Client } from '@dxos/client';
import { getTypename } from '@dxos/echo-schema';

import { BaseCommand, SPACE_KEY } from '../../base';

export default class Query extends BaseCommand<typeof Query> {
  static override enableJsonFlag = true;
  static override description = 'Query database.';

  // TODO(burdon): Implement basic predicates.
  // TODO(burdon): Standardize and factor out selector.
  static override args = SPACE_KEY;

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
