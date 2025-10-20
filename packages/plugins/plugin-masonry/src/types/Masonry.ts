//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Obj, Type } from '@dxos/echo';
import { type JsonSchemaType, ViewAnnotation, toEffectSchema } from '@dxos/echo/internal';
import { SpaceSchema } from '@dxos/react-client/echo';
import { type CreateViewFromSpaceProps, DataType, TypenameAnnotationId, createViewFromSpace } from '@dxos/schema';

import { meta } from '../meta';

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

export const CreateMasonrySchema = Schema.Struct({
  name: Schema.optional(Schema.String),
  typename: Schema.optional(
    Schema.String.annotations({
      [TypenameAnnotationId]: ['used-static', 'dynamic'],
      title: 'Select card record type (leave empty to start fresh)',
    }),
  ),
});

export namespace MasonryAction {
  const MASONRY_ACTION = `${meta.id}/action`;

  export class Create extends Schema.TaggedClass<Create>()(`${MASONRY_ACTION}/create`, {
    input: Schema.extend(Schema.Struct({ space: SpaceSchema }), CreateMasonrySchema),
    output: Schema.Struct({
      object: DataType.View,
    }),
  }) {}
}

/**
 * Make a masonry object.
 */
export const make = (props: Obj.MakeProps<typeof Masonry> = {}) => Obj.make(Masonry, props);

export type MakeViewProps = Omit<CreateViewFromSpaceProps, 'presentation'>;

export const makeView = async ({
  ...props
}: MakeViewProps): Promise<{
  jsonSchema: JsonSchemaType;
  view: DataType.View;
  schema: ReturnType<typeof toEffectSchema>;
}> => {
  const masonry = Obj.make(Masonry, {});
  const { jsonSchema, view } = await createViewFromSpace({ ...props, presentation: masonry });

  // Preset sizes.
  const schema = toEffectSchema(jsonSchema);

  return { jsonSchema, schema, view };
};
