//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { type BlockSchema, type BlockValue, type FieldSchema, type FieldValue, type Row } from '@dxos/deus/schema';
import { Format } from '@dxos/echo';

/** Form keys for a block's header title and inline prose; not MDL field names, which start with a letter. */
export const TITLE = '_title';
export const PROSE = '_prose';

const RowSchema = Schema.Struct({
  name: Schema.String.annotate({ title: 'Name' }),
  optional: Schema.optional(Schema.Boolean).annotate({ title: 'Optional' }),
  value: Schema.String.annotate({ title: 'Type' }),
  note: Schema.optional(Schema.String).annotate({ title: 'Note' }),
});

const EntrySchema = Schema.Struct({ key: Schema.String, text: Schema.String });

const Text = Schema.String.pipe(Format.FormatAnnotation.set(Format.TypeFormat.Text));

/** Whether a field is edited as text bound to its source, rather than through the form's values. */
export const isBoundField = (field: FieldSchema, value: BlockValue): boolean =>
  value.raw.includes(field.name) || ['code', 'prose', 'raw'].includes(field.type.kind);

const fieldSchema = (field: FieldSchema, value: BlockValue): Schema.Top => {
  if (isBoundField(field, value)) {
    return Text;
  }
  const { type } = field;
  switch (type.kind) {
    case 'boolean':
      return Schema.Boolean;
    case 'number':
      return Schema.Number;
    case 'literal':
      return Schema.Literals(type.options);
    case 'ref':
      return type.many ? Schema.Array(Schema.String) : Schema.String;
    case 'list':
      return Schema.Array(Schema.String);
    case 'map':
      return Schema.Array(RowSchema);
    case 'keyed':
      return Schema.Array(EntrySchema);
    default:
      return Schema.String;
  }
};

/** A block kind as a form's schema: its title, its inline prose when it takes it, then its fields in order. */
export const blockFormSchema = (schema: BlockSchema, value: BlockValue) => {
  const fields: Record<string, Schema.Top> = {
    [TITLE]: Schema.optional(Schema.String).annotate({ title: 'Title' }),
    ...(schema.inlineProse && { [PROSE]: Schema.optional(Text).annotate({ title: 'Description' }) }),
    ...Object.fromEntries(
      schema.fields.map((field) => [
        field.name,
        Schema.optional(fieldSchema(field, value)).annotate({ title: field.name, description: field.doc }),
      ]),
    ),
  };
  // The fields are only known at run time, so the form's value type is a record of them.
  return Schema.make<Schema.Codec<Record<string, any>, any>>(Schema.Struct(fields).ast);
};

/** A block's value as the form's values. */
export const toFormValues = (schema: BlockSchema, value: BlockValue): Record<string, unknown> => ({
  [TITLE]: value.title,
  [PROSE]: value.prose,
  ...Object.fromEntries(
    schema.fields.map((field) => {
      const current = value.fields[field.name];
      if (isBoundField(field, value) || typeof current !== 'string') {
        return [field.name, current];
      }
      switch (field.type.kind) {
        case 'boolean':
          return [field.name, current === '' ? undefined : current === 'true'];
        case 'number':
          return [field.name, current === '' || Number.isNaN(Number(current)) ? undefined : Number(current)];
        default:
          return [field.name, current || undefined];
      }
    }),
  ),
});

/** The block value the form's values state; bound fields, the title and the prose keep the block's own. */
export const fromFormValues = (
  schema: BlockSchema,
  value: BlockValue,
  values: Record<string, unknown>,
): BlockValue => ({
  ...value,
  fields: Object.fromEntries(
    schema.fields.map((field): [string, FieldValue | undefined] => {
      const current = values[field.name];
      if (isBoundField(field, value) || field.type.kind === 'keyed') {
        return [field.name, value.fields[field.name]];
      }
      if (current === undefined || current === null) {
        return [field.name, undefined];
      }
      if (field.type.kind === 'map') {
        return [
          field.name,
          (current as readonly Partial<Row>[]).map(({ name = '', optional = false, value = '', note }) => ({
            name,
            optional,
            value,
            ...(note && { note }),
          })),
        ];
      }
      return [field.name, Array.isArray(current) ? current.map(String) : String(current)];
    }),
  ),
});
