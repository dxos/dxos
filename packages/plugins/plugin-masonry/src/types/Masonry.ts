//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Annotation, JsonSchema, Obj, Type } from '@dxos/echo';
import { View } from '@dxos/schema';

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
  Annotation.ViewAnnotation.set(true),
);

export type Masonry = Schema.Schema.Type<typeof Masonry>;

/**
 * Make a masonry object.
 */
export const make = (props: Obj.MakeProps<typeof Masonry> = {}) => Obj.make(Masonry, props);

export type MakeViewProps = Omit<View.MakeFromSpaceProps, 'presentation'>;

export const makeView = async ({
  ...props
}: MakeViewProps): Promise<{
  jsonSchema: JsonSchema.JsonSchema;
  view: View.View;
  schema: ReturnType<typeof JsonSchema.toEffectSchema>;
}> => {
  const masonry = Obj.make(Masonry, {});
  const { jsonSchema, view } = await View.makeFromSpace({ ...props, presentation: masonry });

  // Preset sizes.
  const schema = JsonSchema.toEffectSchema(jsonSchema);

  return { jsonSchema, schema, view };
};
