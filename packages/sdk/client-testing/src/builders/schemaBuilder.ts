//
// Copyright 2022 DXOS.org
//

import debug from 'debug';
import faker from 'faker';

import {
  Database, Item, ObjectModel, Schema, SchemaDef, SchemaField, SchemaRef, TYPE_SCHEMA
} from '@dxos/client';
import type { Model } from '@dxos/model-factory';

import { TestType } from './partyBuilder';

export const log = debug('dxos:client-testing');
debug.enable('dxos:client-testing');

export type SchemaFieldWithGenerator = SchemaField & { generator?: () => string | number | boolean | SchemaRef }
export type SchemaDefWithGenerator = Omit<SchemaDef, 'fields'> & { fields: SchemaFieldWithGenerator[] };

const EXAMPLE_SCHEMA_ORG = 'example:type/schema/organization';
export const DefaultSchemaDefs: { [schema: string]: SchemaDefWithGenerator } = {
  [TestType.Org]: {
    schema: EXAMPLE_SCHEMA_ORG,
    fields: [
      {
        key: 'title',
        required: true,
        generator: () => faker.company.companyName()
      },
      {
        key: 'website',
        required: false,
        generator: () => faker.internet.url()
      },
      {
        key: 'collaborators',
        required: false,
        type: 'number',
        generator: () => faker.datatype.number()
      }
    ]
  },
  [TestType.Person]: {
    schema: 'example:type/schema/person',
    fields: [
      {
        key: 'title',
        required: true,
        generator: () => `${faker.name.firstName()} ${faker.name.lastName()}`
      },
      {
        key: 'organization',
        required: false,
        ref: {
          schema: EXAMPLE_SCHEMA_ORG,
          field: 'title'
        }
      },
      {
        key: 'city',
        required: false,
        type: 'string',
        generator: () => faker.address.cityName()
      },
      {
        key: 'role',
        required: false,
        generator: () => faker.name.jobTitle()
      },
      {
        key: 'active',
        required: false,
        type: 'boolean',
        generator: () => false
      }
    ]
  }
};

export class SchemaBuilder {
  constructor (
    private readonly _database: Database
  ) {}

  get defaultSchemas () {
    return DefaultSchemaDefs;
  }

  async createSchemas (customSchemas?: SchemaDefWithGenerator[]) {
    const schemas = customSchemas ?? Object.values(DefaultSchemaDefs);
    log(`Creating schemas: [${schemas.map(({ schema }) => schema).join()}]`);

    const schemaItems = await Promise.all(schemas.map(({ schema, fields }) => {
      const schemaFields = fields.map(fieldWithGenerator => {
        // eslint-disable-next-line unused-imports/no-unused-vars
        const { generator, ...field } = fieldWithGenerator;
        return field;
      }).flat();

      return this._database.createItem({
        model: ObjectModel,
        type: TYPE_SCHEMA,
        props: {
          schema,
          fields: schemaFields
        }
      });
    }));

    return schemaItems.map(item => new Schema(item.model));
  }

  /**
 * Create items for a given schema.
 * NOTE: Assumes that referenced items have already been constructed.
 */
  async createItems ({ schema, fields }: SchemaDefWithGenerator, numItems: number): Promise<Item<Model<any, any>>[]> {
    log(`Creating items for: ${schema}`);

    return await Promise.all(Array.from({ length: numItems }).map(async () => {
      const values = fields.map(field => {
        if (field.ref) {
        // Look-up item.
          const { entities: items } = this._database.select().filter({ type: field.ref.schema }).exec();
          if (items.length) {
            return {
              [field.key]: faker.random.arrayElement(items).id
            };
          }
        } else {
          return {
            [field.key]: field.generator?.() ?? ''
          };
        }

        return undefined;
      }).filter(Boolean);

      return await this._database.createItem({
        type: schema,
        props: Object.assign({}, ...values)
      });
    }));
  }

  /**
 * Create data for all schemas.
 */
  async createData (customSchemas?: SchemaDefWithGenerator[], options: { [key: string]: number } = {}): Promise<Item<Model<any, any>>[][]> {
    const schemas = customSchemas ?? Object.values(DefaultSchemaDefs);
    const result = [];
    // Synchronous loop.
    for (const schema of schemas) {
      const count = options[schema.schema] ?? 0;
      if (count) {
        const schemaData = await this.createItems(schema, count);
        result.push(schemaData);
      }
    }
    return result;
  }
}
