//
// Copyright 2023 DXOS.org
//

import { Flags, ux } from '@oclif/core';

import { type Client } from '@dxos/client';
import { Filter } from '@dxos/client/echo';
import { getTypename } from '@dxos/echo-schema';

import { ARG_SPACE_KEYS, BaseCommand } from '../../base';
import { table, TABLE_FLAGS, type TableFlags } from '../../util';

export default class Query extends BaseCommand<typeof Query> {
  static override enableJsonFlag = true;
  static override description = 'Query database.';

  static override flags = {
    ...BaseCommand.flags,
    ...TABLE_FLAGS,
    typename: Flags.string({ default: undefined, description: 'Filter objects by typename.' }),
  };

  static override args = ARG_SPACE_KEYS;

  async run(): Promise<any> {
    return await this.execWithClient(async (client: Client) => {
      const space = await this.getSpace(client, this.args.key);
      const filter = this.flags.typename?.length ? Filter.typename(this.flags.typename) : undefined;
      const { objects } = await space.db.query(filter).run();
      this.log('Objects:', objects.length);
      this._printObjects(objects, { extended: this.flags.extended });
      return { objects };
    });
  }

  private _printObjects(objects: any[], flags: TableFlags = {}) {
    ux.stdout(
      table(
        objects,
        {
          id: {
            truncate: true,
          },
          type: {
            get: (row) => getTypename(row),
          },
          data: {
            extended: true,
            get: (row) => row.toJSON(),
          },
        },
        flags,
      ),
    );
  }
}
