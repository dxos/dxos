//
// Copyright 2025 DXOS.org
//

// Schema type definition using Effect/Schema with ECHO annotations.
// This is the core data model for the plugin. ECHO annotations tell the framework
// how to store, display, and interact with objects of this type.

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Obj, Type } from '@dxos/echo';
import { LabelAnnotation } from '@dxos/echo/Annotation';
import { Format, FormatAnnotation } from '@dxos/echo/Format';
import { PropertyMetaAnnotationId } from '@dxos/echo/internal';

// `Type.makeObject` registers this schema as an ECHO type with a globally unique typename.
// The typename is used for storage, queries, and cross-plugin type resolution.
// The class name IS the TypeScript instance type — no separate `type` alias needed.
export class SampleItem extends Type.makeObject<SampleItem>(DXN.make('org.dxos.type.sample', '0.1.0'))(
  Schema.Struct({
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
    // `LabelAnnotation` tells the framework which field(s) to use as the display label.
    // The navigation tree, search results, and breadcrumbs all use this.
    LabelAnnotation.set(['name']),

    // `IconAnnotation` sets the default icon and color for objects of this type.
    // These appear in the navigation tree, breadcrumbs, and object headers.
    Annotation.IconAnnotation.set({ icon: 'ph--book-open--regular', hue: 'cyan' }),
  ),
) {}

// Factory function for creating instances. `Obj.make` creates an ECHO-compatible
// reactive object that can be stored in a space's database.
export const make = (props?: Partial<Obj.MakeProps<typeof SampleItem>>): SampleItem => {
  return Obj.make(SampleItem, {
    name: props?.name,
    description: props?.description,
    status: props?.status ?? 'active',
  });
};
