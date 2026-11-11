//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Obj, Type } from '@dxos/echo';

// #region type
export class Bookmark extends Type.makeObject<Bookmark>(
  DXN.make('com.example.type.bookmark', '0.1.0'),
)(
  Schema.Struct({
    name: Schema.optional(Schema.String.annotate({ title: 'Name' })),
    url: Schema.optional(Schema.String.annotate({ title: 'URL' })),
    visits: Schema.optional(Schema.Number.annotate({ title: 'Visits' })),
  }).pipe(
    Annotation.LabelAnnotation.set(['name']),
    Annotation.IconAnnotation.set({
      icon: 'ph--bookmark-simple--regular',
      hue: 'amber',
    }),
    Annotation.UserType.set(),
  ),
) {}
// #endregion

// #region make
export const make = (
  props: Partial<Obj.MakeProps<typeof Bookmark>> = {},
): Bookmark =>
  Obj.make(Bookmark, {
    name: props.name,
    url: props.url,
    visits: props.visits ?? 0,
  });
// #endregion
