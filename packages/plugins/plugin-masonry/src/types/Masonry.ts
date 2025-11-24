//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

<<<<<<< HEAD
import { Annotation, JsonSchema, Obj, Type } from '@dxos/echo';
import { View } from '@dxos/schema';
||||||| 87517e966b
import { Obj, Type } from '@dxos/echo';
import { type JsonSchemaType, ViewAnnotation, toEffectSchema } from '@dxos/echo/internal';
import { View } from '@dxos/schema';
=======
import { Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation, LabelAnnotation } from '@dxos/echo/internal';
import { View, ViewAnnotation } from '@dxos/schema';
>>>>>>> main

const MasonrySchema = Schema.Struct({
  name: Schema.String.pipe(Schema.optional),

  view: Type.Ref(View.View).pipe(FormInputAnnotation.set(false)),

  arrangement: Schema.Array(
    Schema.Struct({
      ids: Schema.Array(Type.ObjectId),
      hidden: Schema.optional(Schema.Boolean),
    }).pipe(Schema.mutable),
  ).pipe(Schema.mutable, FormInputAnnotation.set(false), Schema.optional),
  // TODO(wittjosiah): Consider Masonry supporting not being just a view but referencing arbitrary data directly.
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/Masonry',
    version: '0.2.0',
  }),
  LabelAnnotation.set(['name']),
  ViewAnnotation.set(true),
);
export interface Masonry extends Schema.Schema.Type<typeof MasonrySchema> {}
export interface MasonryEncoded extends Schema.Schema.Encoded<typeof MasonrySchema> {}
export const Masonry: Schema.Schema<Masonry, MasonryEncoded> = MasonrySchema;

type MakeProps = Omit<Partial<Obj.MakeProps<typeof Masonry>>, 'view'> & {
  view: View.View;
};

/**
 * Make a masonry as a view of a data set.
 */
export const make = ({ name, arrangement = [], view }: MakeProps): Masonry => {
  return Obj.make(Masonry, { name, view: Ref.make(view), arrangement });
};

//
// V1
//

export const MasonryV1 = Schema.Struct({
  arrangement: Schema.Array(
    Schema.Struct({
      ids: Schema.Array(Type.ObjectId),
      hidden: Schema.optional(Schema.Boolean),
    }).pipe(Schema.mutable),
  ).pipe(Schema.mutable, Schema.optional),
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/Masonry',
    version: '0.1.0',
  }),
<<<<<<< HEAD
  Annotation.ViewAnnotation.set(true),
||||||| 87517e966b
  ViewAnnotation.set(true),
=======
>>>>>>> main
);
<<<<<<< HEAD

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
||||||| 87517e966b

export type Masonry = Schema.Schema.Type<typeof Masonry>;

/**
 * Make a masonry object.
 */
export const make = (props: Obj.MakeProps<typeof Masonry> = {}) => Obj.make(Masonry, props);

export type MakeViewProps = Omit<View.MakeFromSpaceProps, 'presentation'>;

export const makeView = async ({
  ...props
}: MakeViewProps): Promise<{
  jsonSchema: JsonSchemaType;
  view: View.View;
  schema: ReturnType<typeof toEffectSchema>;
}> => {
  const masonry = Obj.make(Masonry, {});
  const { jsonSchema, view } = await View.makeFromSpace({ ...props, presentation: masonry });

  // Preset sizes.
  const schema = toEffectSchema(jsonSchema);

  return { jsonSchema, schema, view };
};
=======
>>>>>>> main
