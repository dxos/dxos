//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Obj, Type } from '@dxos/echo';
import { LabelAnnotation, ViewAnnotation } from '@dxos/echo/internal';
import { type CreateViewFromSpaceProps } from '@dxos/schema';

export const Masonry = Schema.Struct({
  name: Schema.optional(Schema.String),
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
  LabelAnnotation.set(['name']),
  ViewAnnotation.set(true),
);

export type Masonry = Schema.Schema.Type<typeof Masonry>;

/**
 * Make a masonry object.
 */
export const make = (props: Obj.MakeProps<typeof Masonry> = {}) => Obj.make(Masonry, props);

export const SettingsSchema = Schema.Struct({
  columnFieldId: Schema.String.annotations({
    title: 'Column field identifier',
  }),
});

export type MakeViewProps = Omit<CreateViewFromSpaceProps, 'presentation'>;
