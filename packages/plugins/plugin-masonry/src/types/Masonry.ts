//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Obj, Type } from '@dxos/echo';
import { type JsonSchemaType, ViewAnnotation, toEffectSchema } from '@dxos/echo/internal';
import { DataType } from '@dxos/schema';

export const Masonry = Schema.Struct({
  arrangement: Schema.Array(
    Schema.Struct({
      ids: Schema.Array(Type.ObjectId),
      hidden: Schema.optional(Schema.Boolean),
    }).pipe(Schema.mutable),
  ).pipe(Schema.mutable, Schema.optional),
  // TODO(wittjosiah): Consider Masonry supporting not being just a view but referencing arbitrary data directly.
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/Masonry',
    version: '0.1.0',
  }),
  ViewAnnotation.set(true),
);

export type Masonry = Schema.Schema.Type<typeof Masonry>;

/**
 * Make a masonry object.
 */
export const make = (props: Obj.MakeProps<typeof Masonry> = {}) => Obj.make(Masonry, props);

export type MakeViewProps = Omit<DataType.View.MakeFromSpaceProps, 'presentation'>;

export const makeView = async ({
  ...props
}: MakeViewProps): Promise<{
  jsonSchema: JsonSchemaType;
  view: DataType.View.View;
  schema: ReturnType<typeof toEffectSchema>;
}> => {
  const masonry = Obj.make(Masonry, {});
  const { jsonSchema, view } = await DataType.View.makeFromSpace({ ...props, presentation: masonry });

  // Preset sizes.
  const schema = toEffectSchema(jsonSchema);

  return { jsonSchema, schema, view };
};
