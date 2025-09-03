//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';
import { Match } from 'effect';

import { Obj, Type } from '@dxos/echo';
import { JsonPath, type JsonSchemaType, toEffectSchema } from '@dxos/echo-schema';
import { ViewAnnotation } from '@dxos/echo-schema';
import { type SimpleType } from '@dxos/effect';
import { type CreateViewFromSpaceProps, type DataType, createViewFromSpace, getSchemaProperties } from '@dxos/schema';

export const Table = Schema.Struct({
  sizes: Schema.Record({
    key: JsonPath,
    value: Schema.Number,
  }).pipe(Schema.mutable),
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/Table',
    version: '0.1.0',
  }),
  ViewAnnotation.set(true),
);

export type Table = Schema.Schema.Type<typeof Table>;

/**
 * Make a table view.
 */
export const make = (props: Partial<Obj.MakeProps<typeof Table>> = {}) => Obj.make(Table, { sizes: {}, ...props });

type MakeViewProps = Omit<CreateViewFromSpaceProps, 'presentation'> & {
  sizes?: Record<string, number>;
};

export const makeView = async ({
  sizes,
  ...props
}: MakeViewProps): Promise<{
  jsonSchema: JsonSchemaType;
  view: DataType.View;
  schema: ReturnType<typeof toEffectSchema>;
}> => {
  const table = Obj.make(Table, { sizes: {} });
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
