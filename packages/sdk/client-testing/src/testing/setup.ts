//
// Copyright 2022 DXOS.org
//

import debug from 'debug';
import faker from 'faker';

import { Client, Party } from '@dxos/client';
import { Schema, SchemaDef, SchemaField, TYPE_SCHEMA } from '@dxos/echo-db';
import { ObjectModel } from '@dxos/object-model';

export const log = debug('dxos:client-testing');
debug.enable('dxos:client-testing');

export type SchemaFieldWithGenerator = SchemaField & { generator: () => string }
export type SchemaDefWithGenerator = Omit<SchemaDef, 'fields'> & { fields: SchemaFieldWithGenerator[] };

type Callback = (party: Party) => Promise<void>

export const setup = async (callback: Callback) => {
  const client = new Client();
  await client.initialize();
  await client.halo.createProfile();
  const party = await client.echo.createParty();
  try {
    await callback(party);
  } finally {
    await party.destroy();
    await client.destroy();
  }
};

/**
 * Create schema items.
 */
export const createSchemas = async (party: Party, schemas: SchemaDefWithGenerator[]) => {
  log(`Creating schemas: [${schemas.map(({ schema }) => schema).join()}]`);

  const schemaItems = await Promise.all(schemas.map(({ schema, fields }) => {
    const schemaFields = fields.map(fieldWithGenerator => {
      // eslint-disable-next-line unused-imports/no-unused-vars
      const { generator, ...field } = fieldWithGenerator;
      return field;
    }).flat();

    return party.database.createItem({
      model: ObjectModel,
      type: TYPE_SCHEMA,
      props: {
        schema,
        fields: schemaFields
      }
    });
  }));

  return schemaItems.map(item => new Schema(item.model));
};

/**
 * Create items for a given schema.
 * NOTE: Assumes that referenced items have already been constructed.
 */
export const createItems = async (party: Party, { schema, fields }: SchemaDefWithGenerator, numItems: number) => {
  log(`Creating items for: ${schema}`);

  return await Promise.all(Array.from({ length: numItems }).map(async () => {
    const values = fields.map(field => {
      if (field.ref) {
        // Look-up item.
        const { entities: items } = party.database.select().filter({ type: field.ref.schema }).exec();
        if (items.length) {
          return {
            [field.key]: faker.random.arrayElement(items).id
          };
        }
      } else {
        return {
          [field.key]: field.generator()
        };
      }

      return undefined;
    }).filter(Boolean);

    return await party.database.createItem({
      type: schema,
      props: Object.assign({}, ...values)
    });
  }));
};

/**
 * Create data for all schemas.
 */
export const createData = async (party: Party, schemas: SchemaDefWithGenerator[], options: { [key: string]: number } = {}) => {
  // Synchronous loop.
  for (const schema of schemas) {
    const count = options[schema.schema] ?? 0;
    if (count) {
      await createItems(party, schema, count);
    }
  }
};
