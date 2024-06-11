//
// Copyright 2022 DXOS.org
//

import { ux } from '@oclif/core';

import { FLAG_SPACE_KEYS } from '@dxos/cli-base';
import { table, type TableFlags, TABLE_FLAGS } from '@dxos/cli-base';
import { type StaticSchema } from '@dxos/echo-schema';

import { BaseCommand } from '../../../base';

// TODO(burdon): Option to output JSON schema.

export default class List extends BaseCommand<typeof List> {
  static {
    this.description = 'List schema.';
  }

  static override flags = {
    ...BaseCommand.flags,
    ...TABLE_FLAGS,
    ...FLAG_SPACE_KEYS,
  };

  async run(): Promise<any> {
    const { key } = this.args;
    return await this.execWithClient(async ({ client }) => {
      const space = await this.getSpace(client, key);
      const schemas = await space.db.schema.list();
      printSchema(schemas, this.flags);
    });
  }
}

const printSchema = (schemas: StaticSchema[], flags: TableFlags = {}) => {
  return ux.stdout(
    table(
      schemas,
      {
        storedSchemaId: { truncate: true }, // TODO(burdon): undefined.
        typename: {}, // TODO(burdon): Sometimes undefined.
        version: {}, // TODO(burdon): undefined.
      },
      flags,
    ),
  );
};
