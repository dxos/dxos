//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Obj, Type } from '@dxos/echo';

// #region type
export class StashedLink extends Type.makeObject<StashedLink>(
  DXN.make('com.example.type.stashedLink', '0.1.0'),
)(
  Schema.Struct({
    title: Schema.optional(Schema.String.annotate({ title: 'Title' })),
    url: Schema.optional(Schema.String.annotate({ title: 'URL' })),
    note: Schema.optional(Schema.String.annotate({ title: 'Note' })),
    read: Schema.optional(Schema.Boolean.annotate({ title: 'Read' })),
  }).pipe(
    Annotation.LabelAnnotation.set(['title']),
    Annotation.IconAnnotation.set({
      icon: 'ph--tray-arrow-down--regular',
      hue: 'indigo',
    }),
    Annotation.UserType.set(),
  ),
) {}
// #endregion

// #region make
export const make = (
  props: Partial<Obj.MakeProps<typeof StashedLink>> = {},
): StashedLink =>
  Obj.make(StashedLink, {
    title: props.title,
    url: props.url,
    note: props.note ?? '',
    read: props.read ?? false,
  });
// #endregion
