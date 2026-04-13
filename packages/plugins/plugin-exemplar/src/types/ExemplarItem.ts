//
// Copyright 2025 DXOS.org
//

// Schema type definition using Effect/Schema with ECHO annotations.
// This is the core data model for the plugin. ECHO annotations tell the framework
// how to store, display, and interact with objects of this type.

import * as Schema from 'effect/Schema';

import { Annotation, Obj, Type } from '@dxos/echo';
import { Format, FormatAnnotation, LabelAnnotation, PropertyMetaAnnotationId } from '@dxos/echo/internal';

export const ExemplarItem = Schema.Struct({
  // Fields are `Schema.optional` because ECHO objects start with undefined fields
  // and are populated asynchronously. The schema describes the shape, not required values.
  name: Schema.optional(Schema.String.annotations({ title: 'Name' })),
  description: Schema.optional(Schema.String.annotations({ title: 'Description' })),

  // `Schema.Literal` restricts the field to specific values.
  // `FormatAnnotation.set(Format.TypeFormat.SingleSelect)` tells the form system
  // to render this as a dropdown select.
  // `PropertyMetaAnnotationId` provides display metadata (labels, colors) for each option.
  status: Schema.Literal('active', 'archived', 'draft').pipe(
    FormatAnnotation.set(Format.TypeFormat.SingleSelect),
    Schema.annotations({
      title: 'Status',
      [PropertyMetaAnnotationId]: {
        singleSelect: {
          options: [
            { id: 'active', title: 'Active', color: 'green' },
            { id: 'archived', title: 'Archived', color: 'gray' },
            { id: 'draft', title: 'Draft', color: 'indigo' },
          ],
        },
      },
    }),
    Schema.optional,
  ),
}).pipe(
  // `Type.object` registers this schema as an ECHO type with a globally unique typename.
  // The typename is used for storage, queries, and cross-plugin type resolution.
  Type.object({
    typename: 'org.dxos.type.exemplar',
    version: '0.1.0',
  }),

  // `LabelAnnotation` tells the framework which field(s) to use as the display label.
  // The navigation tree, search results, and breadcrumbs all use this.
  LabelAnnotation.set(['name']),

  // `IconAnnotation` sets the default icon and color for objects of this type.
  // These appear in the navigation tree, breadcrumbs, and object headers.
  Annotation.IconAnnotation.set({
    icon: 'ph--book-open--regular',
    hue: 'cyan',
  }),
);

// The interface provides the TypeScript instance type for use in type positions.
// By convention, the namespace has `.ExemplarItem` as the type and the schema as the value.
export interface ExemplarItem extends Schema.Schema.Type<typeof ExemplarItem> {}

// Factory function for creating instances. `Obj.make` creates an ECHO-compatible
// reactive object that can be stored in a space's database.
export const make = (props?: Partial<Obj.MakeProps<typeof ExemplarItem>>): ExemplarItem => {
  return Obj.make(ExemplarItem, {
    name: props?.name,
    description: props?.description,
    status: props?.status ?? 'active',
  });
};
