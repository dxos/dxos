//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Obj, Ref, Type } from '@dxos/echo';
import { FormAnnotation, LabelAnnotation } from '@dxos/echo/internal';
import { View, ViewAnnotation } from '@dxos/schema';

const MasonrySchema = Schema.Struct({
  name: Schema.String.pipe(Schema.optional),

  view: Type.Ref(View.View).pipe(FormAnnotation.set(false)),

  arrangement: Schema.Array(
    Schema.Struct({
      ids: Schema.Array(Type.ObjectId),
      hidden: Schema.optional(Schema.Boolean),
    }).pipe(Schema.mutable),
  ).pipe(Schema.mutable, FormAnnotation.set(false), Schema.optional),
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

type MakeWithViewProps = Omit<Partial<Obj.MakeProps<typeof Masonry>>, 'view'> & {
  view: View.View;
};

/**
 * Make a masonry with an existing view.
 */
export const makeWithView = ({ view, ...props }: MakeWithViewProps): Masonry =>
  Obj.make(Masonry, { arrangement: [], view: Ref.make(view), ...props });

type MakeProps = Partial<Omit<Obj.MakeProps<typeof Masonry>, 'view'>> & View.MakeFromSpaceProps;

/**
 * Make a masonry as a view of a data set.
 */
export const make = async ({ name, arrangement = [], ...props }: MakeProps): Promise<Masonry> => {
  const { view } = await View.makeFromSpace(props);
  return Obj.make(Masonry, { name, view: Ref.make(view), arrangement });
};
