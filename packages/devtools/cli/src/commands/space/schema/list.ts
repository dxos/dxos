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

      // TODO(burdon): Doesn't stringify (just returns "null").
      // TODO(burdon): Reconcile addType with schema.
      //  space.db.schema.get/list()
      //  rename runtimeSchemaRegistry
      const schemas = client.experimental.graph.schemaRegistry.schemas;
      console.log(schemas.map((s2) => s2));
      printSchema(schemas, this.flags);
    });

    return await this.execWithSpace(
      async ({ space }) => {
        const schemas = await space.db.schemaRegistry.getAll();
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
