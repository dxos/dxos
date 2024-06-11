//
// Copyright 2022 DXOS.org
//

import { ux } from '@oclif/core';

import { FLAG_SPACE_KEYS } from '@dxos/cli-base';
import { table, type TableFlags, TABLE_FLAGS } from '@dxos/cli-base';
import { FunctionDef, FunctionTrigger } from '@dxos/functions';

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
    const { space: spaceKeys } = this.flags;
    await this.execWithClient(async ({ client }) => {
      // TODO(burdon): Registered by plugin?
      client.addSchema(FunctionDef, FunctionTrigger);
    });

    return await this.execWithSpace(
      async ({ space }) => {
        const schemas = await space.db.schema.list();
        printSchema(schemas, this.flags);
      },
      { spaceKeys },
    );
  }
}

const printSchema = (schema: any[], flags: TableFlags = {}) => {
  return ux.stdout(
    table(
      schema,
      {
        id: {}, // TODO(burdon): undefined.
        typename: {}, // TODO(burdon): Sometimes undefined.
        version: {}, // TODO(burdon): undefined.
      },
      flags,
    ),
  );
};
