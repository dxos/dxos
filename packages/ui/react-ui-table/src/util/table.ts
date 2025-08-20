//
// Copyright 2024 DXOS.org
//

import { Match } from 'effect';

import { Obj } from '@dxos/echo';
import { type JsonPath, type JsonSchemaType, toEffectSchema } from '@dxos/echo-schema';
import { type SimpleType } from '@dxos/effect';
import { type CreateViewFromSpaceProps, type DataType, createViewFromSpace, getSchemaProperties } from '@dxos/schema';

import { TableView } from '../types';

type CreateTableProps = Omit<CreateViewFromSpaceProps, 'presentation'> & {
  sizes?: Record<string, number>;
};

export const createTable = async ({
  sizes,
  ...props
}: CreateTableProps): Promise<{
  jsonSchema: JsonSchemaType;
  view: DataType.View;
  schema: ReturnType<typeof toEffectSchema>;
}> => {
  const table = Obj.make(TableView, { sizes: {} });
  const { jsonSchema, view } = await createViewFromSpace({ ...props, presentation: table });

  // Preset sizes.
  const schema = toEffectSchema(jsonSchema);
  const shouldIncludeId = props.fields?.find((field) => field === 'id') !== undefined;
  const properties = getSchemaProperties(schema.ast, {}, shouldIncludeId);
  for (const property of properties) {
    if (sizes?.[property.name]) {
      table.sizes[property.name as JsonPath] = sizes[property.name];
      continue;
    }

    Match.type<SimpleType>().pipe(
      Match.when('boolean', () => {
        table.sizes[property.name as JsonPath] = 100;
      }),
      Match.when('number', () => {
        table.sizes[property.name as JsonPath] = 100;
      }),
      Match.orElse(() => {
        // Noop.
      }),
    )(property.type);
  }

  return { jsonSchema, schema, view };
};
