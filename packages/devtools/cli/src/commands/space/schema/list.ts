//
// Copyright 2022 DXOS.org
//

import { ux } from '@oclif/core';

import { FLAG_SPACE_KEYS } from '@dxos/cli-base';
import { table, type TableFlags } from '@dxos/cli-base';
import { FunctionDef, FunctionTrigger } from '@dxos/functions';

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

  // TODO(burdon): Table.

  async run(): Promise<any> {
    const { space: spaceKeys } = this.flags;
    return await this.execWithSpace(
      async ({ client, space }) => {
        client.addSchema(FunctionDef, FunctionTrigger);

        // TODO(burdon): Doesn't stringify.
        const s1 = await space.db.schemaRegistry.getAll();
        ux.stdout('1', JSON.stringify(s1, undefined, 2));
        printSchema(s1);

        const s2 = client.experimental.graph.runtimeSchemaRegistry.schemas;
        ux.stdout('2', JSON.stringify(s2, undefined, 2));
        printSchema(s2);
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
        id: {},
      },
      flags,
    ),
  );
};
