//
// Copyright 2022 DXOS.org
//

import { Flags, ux } from '@oclif/core';

import { FLAG_SPACE_KEYS, TABLE_FLAGS, type TableFlags, table } from '@dxos/cli-base';
import { getTypeAnnotation } from '@dxos/echo/internal';

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

      const echoSchema = await space.db.schemaRegistry.query().run();
      const runtimeSchema = space.db.graph.schemaRegistry.schemas;

      const schemas = [
        ...echoSchema.map((schema): SchemaEntry => schema),
        ...runtimeSchema.map((schema): SchemaEntry => {
          const schemaAnnotation = getTypeAnnotation(schema)!;
          return {
            typename: schemaAnnotation.typename,
            version: schemaAnnotation.version,
          };
        }),
      ].filter(typenameFilter);
      printSchema(schemas, this.flags as any);
    });
  }
}

const createTypenameFilter = (typenameFilter?: string) => {
  if (!typenameFilter) {
    return () => true;
  }

  return (schema: SchemaEntry) => schema.typename.toLowerCase().includes(typenameFilter.toLowerCase());
};

type SchemaEntry = {
  id?: string;
  typename: string;
  version: string;
};

// TODO(burdon): Static vs. dynamic.
const printSchema = (schemas: SchemaEntry[], flags: TableFlags = {}) => {
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
