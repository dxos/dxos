//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';

import { Annotation, Format, Ref } from '@dxos/echo';

import { Organization } from '../testing/schema.ts';

/** Every scalar renderer the spike ports, one property each. */
export const ScalarSchema = Schema.Struct({
  name: Schema.String.pipe(Schema.check(Schema.isMinLength(1))).annotate({ title: 'Name' }),
  age: Schema.optional(
    Schema.Number.pipe(
      Schema.check(Schema.isInt()),
      Schema.check(Schema.isBetween({ minimum: 0, maximum: 150 })),
    ).annotate({ title: 'Age' }),
  ),
  active: Schema.optional(Schema.Boolean.annotate({ title: 'Active' })),
  status: Schema.optional(Schema.Literals(['active', 'inactive', 'archived']).annotate({ title: 'Status' })),
  model: Schema.optional(Schema.String.annotate({ title: 'Model' })),
  notes: Schema.optional(Format.Text.annotate({ title: 'Notes' })),
  secret: Schema.optional(
    Schema.String.pipe(Format.FormatAnnotation.set(Format.TypeFormat.Password)).annotate({ title: 'Secret' }),
  ),
  birthday: Schema.optional(Format.DateOnly.annotate({ title: 'Birthday' })),
  meetingAt: Schema.optional(Format.DateTime.annotate({ title: 'Next meeting' })),
  reminderAt: Schema.optional(Format.TimeOnly.annotate({ title: 'Reminder' })),
  location: Schema.optional(Format.GeoPoint.annotate({ title: 'Location' })),
  // An array, so the form's trailing-icon column includes a header action and a row's remove.
  tags: Schema.optional(Schema.Array(Schema.String).annotate({ title: 'Tags' })),
  // A nested object, so it includes a group's disclosure.
  address: Schema.optional(
    Schema.Struct({ street: Schema.optional(Schema.String), city: Schema.optional(Schema.String) }).annotate({
      title: 'Address',
    }),
  ),
}).mapFields(Struct.map(Schema.mutableKey));

export type ScalarValues = Schema.Schema.Type<typeof ScalarSchema>;

export const SCALAR_VALUES: ScalarValues = {
  name: 'Ada',
  age: 36,
  birthday: '1815-12-10',
  reminderAt: '09:00:00',
  location: [-0.1276, 51.5072],
  tags: ['analytical'],
};

/** A struct nested `depth` levels, `fields` text properties at each level; the depth-5 benchmark's shape. */
export const makeNestedSchema = (depth: number, fields: number): Schema.Codec<any, any, never, never> => {
  const leaves = Object.fromEntries(
    Array.from({ length: fields }, (_, index) => [
      `field${index}`,
      Schema.optional(Schema.String.annotate({ title: `Field ${index + 1}` })),
    ]),
  );
  return Schema.Struct(
    depth > 0
      ? { ...leaves, child: Schema.optional(makeNestedSchema(depth - 1, fields).annotate({ title: `Level ${depth}` })) }
      : leaves,
  );
};

/** Arrays: plain strings, an ordered (reorderable) list and an array of structs. */
export const ArraySchema = Schema.Struct({
  tags: Schema.optional(Schema.Array(Schema.String).annotate({ title: 'Tags' })),
  steps: Schema.optional(
    Schema.Array(Schema.String).pipe(Annotation.FormOrderedAnnotation.set(true)).annotate({ title: 'Steps' }),
  ),
  contacts: Schema.optional(
    Schema.Array(
      Schema.Struct({
        kind: Schema.String.annotate({ title: 'Kind' }),
        value: Schema.String.annotate({ title: 'Value' }),
      }),
    ).annotate({ title: 'Contacts' }),
  ),
}).mapFields(Struct.map(Schema.mutableKey));

export type ArrayValues = Schema.Schema.Type<typeof ArraySchema>;

/** A single reference. */
export const RefSchema = Schema.Struct({
  employer: Schema.optional(Ref.Ref(Organization).annotate({ title: 'Employer' })),
}).mapFields(Struct.map(Schema.mutableKey));

/** A realistic settings form (plugin-markdown-like), for the two-track settings layout. */
export const EditorSettingsSchema = Schema.Struct({
  viewMode: Schema.Literals(['preview', 'readonly', 'source']).annotate({
    title: 'Default view mode',
    description: 'Set whether documents open in editing or read-only mode.',
  }),
  toolbar: Schema.optional(
    Schema.Boolean.annotate({ title: 'Show toolbar', description: 'Display a formatting toolbar above the editor.' }),
  ),
  fontSize: Schema.optional(
    Schema.Number.annotate({ title: 'Font size', description: 'Editor font size, in pixels.' }),
  ),
  numberedHeadings: Schema.optional(
    Schema.Boolean.annotate({ title: 'Numbered headings', description: 'Prefix headings with outline numbers.' }),
  ),
}).mapFields(Struct.map(Schema.mutableKey));

export const SyncSettingsSchema = Schema.Struct({
  endpoint: Schema.optional(
    Schema.String.annotate({ title: 'Endpoint', description: 'The sync server this device replicates with.' }),
  ),
  interval: Schema.optional(
    Schema.Number.annotate({ title: 'Interval', description: 'Seconds between background syncs.' }),
  ),
  wifiOnly: Schema.optional(
    Schema.Boolean.annotate({ title: 'Wi-Fi only', description: 'Pause sync on metered networks.' }),
  ),
}).mapFields(Struct.map(Schema.mutableKey));

/** Both settings sections in one form; each section renders its own properties with `include`. */
export const SettingsSchema = Schema.Struct({ ...EditorSettingsSchema.fields, ...SyncSettingsSchema.fields });

export type SettingsValues = Schema.Schema.Type<typeof SettingsSchema>;
