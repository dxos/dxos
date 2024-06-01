//
// Copyright 2023 DXOS.org
//

import { ux, Flags } from '@oclif/core';

import { type Client } from '@dxos/client';
import { Filter } from '@dxos/client/echo';
import { getTypename } from '@dxos/echo-schema';

import { ARG_SPACE_KEYS, BaseCommand } from '../../base';

export default class Query extends BaseCommand<typeof Query> {
  static override enableJsonFlag = true;
  static override description = 'Query database.';

  static override flags = {
    ...BaseCommand.flags,
    data: Flags.boolean({ default: false, description: 'Print serialized object representation.' }),
    typename: FlagS.String({ default: undefined, description: 'Filter objects by typename.' }),
  };

  static override args = ARG_SPACE_KEYS;

  async run(): Promise<any> {
    return await this.execWithClient(async (client: Client) => {
      const space = await this.getSpace(client, this.args.key);
      const filter = this.flags.typename?.length ? Filter.typename(this.flags.typename) : undefined;
      const { objects } = await space.db.query(filter).run();
      this.log('Objects:', objects.length);
      this._printObjects(objects);
      return { objects };
    });
  }

  private _printObjects(objects: any[]) {
    ux.table(objects, {
      id: {
        header: 'id',
        get: (row) => row.id.slice(0, 8),
      },
      type: {
        header: 'type',
        get: (row) => getTypename(row),
      },
      ...(this.flags.data ? { data: { header: 'data', get: (row) => row.toJSON() } } : {}),
    });
  }
}
