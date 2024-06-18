//
// Copyright 2022 DXOS.org
//

import { Flags, ux } from '@oclif/core';

import { FLAG_SPACE_KEYS } from '@dxos/cli-base';
import { table, type TableFlags, TABLE_FLAGS } from '@dxos/cli-base';
import { type StaticSchema } from '@dxos/echo-schema';

import { BaseCommand } from '../../../base';

// TODO(burdon): Option to output JSON schema.

export default class List extends BaseCommand<typeof List> {
  static override enableJsonFlag = true;

  static {
    this.description = 'List schema.';
  }

  static override flags = {
    ...BaseCommand.flags,
    ...TABLE_FLAGS,
    ...FLAG_SPACE_KEYS,
    typename: Flags.string({ default: undefined, description: 'Filter objects by typename.' }),
  };

  async run(): Promise<any> {
    const { key } = this.args;
    return await this.execWithClient(async ({ client }) => {
      const space = await this.getSpace(client, key);
      const typenameFilter = createTypenameFilter(this.flags.typename);
      const schemas = (await space.db.schema.listAll()).filter(typenameFilter);
      printSchema(schemas, this.flags);
    });
  }
}

const createTypenameFilter = (typenameFilter?: string) => {
  if (!typenameFilter) {
    return () => true;
  }

  return (schema: StaticSchema) => schema.typename.toLowerCase().includes(typenameFilter.toLowerCase());
};

// TODO(burdon): Static vs. dynamic.
const printSchema = (schemas: StaticSchema[], flags: TableFlags = {}) => {
  ux.stdout(
    table(
      schemas,
      {
        id: {
          truncate: true,
        },
        typename: {},
        version: {},
      },
      flags,
    ),
  );
};
