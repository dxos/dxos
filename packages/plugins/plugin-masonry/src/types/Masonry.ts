//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

// QueryAST is referenced indirectly through `Type.InstanceType<typeof MasonrySchema>`
// (Ref.Ref(View.View) → View.View → QueryAST.Query) in the emitted .d.ts; the
// namespace import keeps the inferred types portable.
// eslint-disable-next-line unused-imports/no-unused-imports
import { DXN, Annotation, Obj, QueryAST, Ref, Type, View } from '@dxos/echo';
import { FormInputAnnotation, LabelAnnotation } from '@dxos/echo/internal';
import { ViewAnnotation } from '@dxos/schema';

const MasonrySchema = Schema.Struct({
  name: Schema.String.pipe(Schema.optional),

  view: Ref.Ref(View.View).pipe(FormInputAnnotation.set(false)),

  arrangement: Schema.Array(
    Schema.Struct({
      ids: Schema.Array(Obj.ID),
      hidden: Schema.optional(Schema.Boolean),
    }),
  ).pipe(FormInputAnnotation.set(false), Schema.optional),
  // TODO(wittjosiah): Consider Masonry supporting not being just a view but referencing arbitrary data directly.
}).pipe(
  LabelAnnotation.set(['name']),
  ViewAnnotation.set(['view']),
  Annotation.IconAnnotation.set({
    icon: 'ph--wall--regular',
    hue: 'green',
  }),
  Type.makeObject(DXN.make('org.dxos.type.masonry', '0.1.0')),
);

// TODO(wittjosiah): Try to clean up this type inference.
export interface Masonry extends Type.InstanceType<typeof MasonrySchema> {}
export const Masonry: Type.Obj<Masonry> = MasonrySchema as any;

type MakeProps = Omit<Partial<Obj.MakeProps<typeof Masonry>>, 'view'> & {
  view: View.View;
};

/**
 * Make a masonry as a view of a data set.
 */
export const make = ({ name, arrangement = [], view }: MakeProps): Masonry => {
  return Obj.make(Masonry, { name, view: Ref.make(view), arrangement });
};
