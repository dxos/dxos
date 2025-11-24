//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation, LabelAnnotation } from '@dxos/echo/internal';
import { ObjectId } from '@dxos/keys';
import { View, ViewAnnotation } from '@dxos/schema';

const MasonrySchema = Schema.Struct({
  name: Schema.String.pipe(Schema.optional),

  view: Type.Ref(View.View).pipe(FormInputAnnotation.set(false)),

  arrangement: Schema.Array(
    Schema.Struct({
      ids: Schema.Array(ObjectId),
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
      ids: Schema.Array(ObjectId),
      hidden: Schema.optional(Schema.Boolean),
    }).pipe(Schema.mutable),
  ).pipe(Schema.mutable, Schema.optional),
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/Masonry',
    version: '0.1.0',
  }),
);
