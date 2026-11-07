//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import {
  type BlockSchema,
  type BlockValue,
  type Entry,
  type FieldSchema,
  type FieldValue,
  type Row,
  type SourceBlock,
  isSpecReference,
  mintKey,
  parseCitation,
} from '@dxos/deus/schema';
import { Annotation, Format } from '@dxos/echo';
import { PropertyMetaAnnotationId } from '@dxos/echo/internal';
import { OptionsLookupAnnotation, type OptionsLookupEntry, optionsLookup } from '@dxos/react-ui-form';

import type * as ProjectCapabilities from '../../types/ProjectCapabilities.ts';
import { type SpecBlocks } from './spec-blocks-state.ts';

/** Form keys for a block's header title and inline prose; not MDL field names, which start with a letter. */
export const TITLE = '_title';
export const PROSE = '_prose';

/** A field's key in the form's values: its name, with `-` (`adds-fields`) as `_`, since a form path has no `-`. */
export const formKey = (name: string) => name.replace(/-/g, '_');

/** What a block's form reads beyond its kind: the spec's other blocks, which references and types pick from. */
export type BlockFormContext = {
  blocks: SpecBlocks;
  block: SourceBlock;
  /** The space's specs, which a `Ref<spec>` field picks from. */
  specs?: () => readonly { id: string; name?: string }[];
  /** The text an item, a row's name or a keyed line added from the form starts with. */
  defaults: { item: string; entry: string };
  /** A style per value of a choice field, by field name. */
  facts?: ProjectCapabilities.SpecFacts;
};

const Text = Schema.String.pipe(Format.FormatAnnotation.set(Format.TypeFormat.Text));

/** A string picked from `options` in a combobox that also takes any typed text. */
const Picked = (options: readonly OptionsLookupEntry[]) =>
  Schema.String.pipe(
    OptionsLookupAnnotation.set(
      optionsLookup<{}>()([], () => Effect.succeed(options), { combobox: true, eager: true }),
    ),
  );

/** The built-in type names a type expression may use besides the spec's `type` blocks. */
const PRIMITIVES = ['any', 'boolean', 'Date', 'number', 'ReactNode', 'string', 'unknown', 'void'];

/** The blocks of the given kinds (any kind for none) a reference may name, by key, labelled as the spec reads them. */
export const blockOptions = (
  { items, schemas }: SpecBlocks,
  kinds: readonly string[],
  self?: SourceBlock,
): OptionsLookupEntry[] =>
  items
    .filter(
      (item) => !item.entry && item.key && item.block !== self && (kinds.length === 0 || kinds.includes(item.kind)),
    )
    .map(({ kind, key, label, block }) => ({
      value: key,
      label: label ?? key,
      secondaryLabel: block.title,
      icon: schemas.get(kind)?.icon,
      hue: schemas.get(kind)?.hue,
    }));

/** What a type expression may name: the built-in types, then the spec's `type` blocks by name. */
const typeOptions = ({ blocks, block: self }: BlockFormContext): OptionsLookupEntry[] => [
  ...PRIMITIVES.map((value) => ({ value })),
  ...blocks.items
    .filter((item) => !item.entry && item.kind === 'type' && item.block.id && item.block !== self)
    .map(({ block }) => ({ value: block.id, secondaryLabel: block.title })),
];

/** Whether a reference field names blocks of this spec or a spec, so it picks them; `ActorRef` names people instead. */
const isPickedRef = (field: FieldSchema, { schemas }: SpecBlocks) =>
  isSpecReference(field) ||
  (field.type.kind === 'ref' && (field.type.to.length === 0 || field.type.to.some((kind) => schemas.has(kind))));

/** A block named with its kind, as the app dialect writes references (`op:Sort`, `type:Message`). */
const PREFIXED = /^([a-z][\w-]*):(.+)$/;

/** The options a picked reference offers: the space's specs for `Ref<spec>`, else the blocks of its kinds. */
const refOptions = (field: FieldSchema, { blocks, block, specs }: BlockFormContext): OptionsLookupEntry[] =>
  isSpecReference(field)
    ? (specs?.() ?? []).map(({ id, name }) => ({ value: `echo:///${id}`, label: name || id }))
    : blockOptions(blocks, field.type.kind === 'ref' ? field.type.to : [], block);

/** A reference's names as the options they pick: a block by key or label (`F-1`, `op:Sort`), a spec however cited. */
const toPicked = (field: FieldSchema, context: BlockFormContext, names: readonly string[]) => {
  const options = refOptions(field, context);
  return names.map((name) => {
    if (isSpecReference(field)) {
      return options.find((option) => parseCitation(option.value).spec === parseCitation(name).spec)?.value ?? name;
    }
    const match = name.match(PREFIXED);
    const key = match && context.blocks.schemas.has(match[1]) ? match[2] : name;
    return options.find((option) => option.value === key || option.label === key)?.value ?? key;
  });
};

/** Picked options as the names the source writes: prefixed with their kind where the field takes several kinds. */
const fromPicked = (
  field: FieldSchema,
  context: BlockFormContext,
  ids: readonly string[],
  before: readonly string[],
) => {
  const kinds = field.type.kind === 'ref' ? field.type.to : [];
  const prefixed =
    kinds.length > 1 || before.some((name) => context.blocks.schemas.has(name.match(PREFIXED)?.[1] ?? ''));
  return ids.map((id) => {
    const previous = before.find((name) => toPicked(field, context, [name])[0] === id);
    const kind = context.blocks.items.find((item) => !item.entry && item.key === id)?.kind;
    return previous ?? (kind && prefixed ? `${kind}:${id}` : id);
  });
};

/** Whether a field is edited as text bound to its source, rather than through the form's values. */
export const isBoundField = (field: FieldSchema, value: BlockValue): boolean =>
  value.raw.includes(field.name) || ['code', 'prose', 'raw'].includes(field.type.kind);

const Ordered = Annotation.FormOrderedAnnotation.set(true);

/** Whether a field is edited as an ordered list, whose rows take drag handles while editable. */
export const isOrderedField = (field: FieldSchema, value: BlockValue, blocks: SpecBlocks): boolean =>
  !isBoundField(field, value) &&
  (['keyed', 'list', 'map'].includes(field.type.kind) ||
    (field.type.kind === 'ref' && !!field.type.many && !isPickedRef(field, blocks)));

const fieldSchema = (field: FieldSchema, value: BlockValue, context: BlockFormContext): Schema.Top => {
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
      // Each choice as a title, with its package's icon and hue where it has one (`in-progress` → In progress).
      return Schema.Literals(type.options).annotate({
        [PropertyMetaAnnotationId]: {
          singleSelect: {
            options: type.options.map((id) => {
              const style = context.facts?.[field.name]?.[id];
              return { id, title: fieldTitle(id), color: style?.hue, icon: style?.icon };
            }),
          },
        },
      });
    case 'ref': {
      if (!isPickedRef(field, context.blocks)) {
        return type.many ? Schema.Array(Schema.String).pipe(Ordered) : Schema.String;
      }
      const picked = Picked(refOptions(field, context));
      return type.many
        ? Schema.Array(picked).pipe(
            Annotation.ArrayPresentationAnnotation.set({ display: 'tag', ordered: !!type.chain }),
          )
        : picked;
    }
    case 'typeExpr':
      return Picked(typeOptions(context));
    case 'list':
      return Schema.Array(Schema.String).pipe(Ordered);
    case 'map':
      return Schema.Array(
        Schema.Struct({
          name: Schema.String.annotate({ title: 'Name' }),
          optional: Schema.optional(Schema.Boolean).annotate({ title: 'Optional' }),
          // An `ext` block's field types are the language's (`Prose`, `Identifier`), not the spec's.
          value: (type.value === 'type' && context.block.kind !== 'ext'
            ? Picked(typeOptions(context))
            : Schema.String
          ).annotate({ title: type.value === 'type' ? 'Type' : 'Value' }),
        }),
      ).pipe(Ordered);
    case 'keyed':
      return Schema.Array(Schema.Struct({ key: Schema.String, text: Schema.String })).pipe(Ordered);
    default:
      return Schema.String;
  }
};

/** A field's label: its name as a phrase (`adds-fields` → `Adds fields`). */
export const fieldTitle = (name: string) => name.charAt(0).toUpperCase() + name.slice(1).replace(/-/g, ' ');

/** A block kind as a form's schema: its title, its inline prose when it takes it, then its fields in order. */
export const blockFormSchema = (schema: BlockSchema, value: BlockValue, context: BlockFormContext) => {
  const fields: Record<string, Schema.Top> = {
    [TITLE]: Schema.optional(Schema.String).annotate({ title: 'Title' }),
    ...(schema.inlineProse && { [PROSE]: Schema.optional(Text).annotate({ title: 'Description' }) }),
    ...Object.fromEntries(
      schema.fields.map((field) => [
        formKey(field.name),
        Schema.optional(fieldSchema(field, value, context)).annotate({
          title: fieldTitle(field.name),
          description: field.doc,
        }),
      ]),
    ),
  };
  // The fields are only known at run time, so the form's value type is a record of them.
  return Schema.make<Schema.Codec<Record<string, any>, any>>(Schema.Struct(fields).ast);
};

const strings = (value: FieldValue | undefined): readonly string[] => [value ?? []].flat().map(String);

/**
 * The options a block's form offers, as a string that changes only when they do: the form's schema is rebuilt on it, so
 * an edit elsewhere in the spec leaves its bound editors mounted.
 */
export const formOptionsKey = (schema: BlockSchema, context: BlockFormContext): string =>
  JSON.stringify(
    schema.fields.map((field) =>
      field.type.kind === 'ref' && isPickedRef(field, context.blocks)
        ? refOptions(field, context)
        : field.type.kind === 'typeExpr' || field.type.kind === 'map'
          ? typeOptions(context)
          : field.type.kind === 'literal'
            ? (context.facts?.[field.name] ?? null)
            : null,
    ),
  );

/** A block's value as the form's values. */
export const toFormValues = (
  schema: BlockSchema,
  value: BlockValue,
  context: BlockFormContext,
): Record<string, unknown> => ({
  [TITLE]: value.title,
  [PROSE]: value.prose,
  ...Object.fromEntries(
    schema.fields.map((field) => {
      const current = value.fields[field.name];
      const key = formKey(field.name);
      if (isBoundField(field, value) || current === undefined) {
        return [key, current];
      }
      switch (field.type.kind) {
        case 'boolean':
          return [key, current === '' ? undefined : current === 'true'];
        case 'number':
          return [key, current === '' || Number.isNaN(Number(current)) ? undefined : Number(current)];
        case 'ref': {
          const names = strings(current);
          const ids = isPickedRef(field, context.blocks) ? toPicked(field, context, names) : names;
          return [key, field.type.many ? ids : ids[0]];
        }
        case 'list':
          return [key, strings(current)];
        case 'map':
          // A row's comment stays in the source; the form shows what the row states.
          return [key, (current as readonly Row[]).map(({ note: _, ...row }) => row)];
        case 'keyed':
          return [key, current];
        default:
          return [key, current || undefined];
      }
    }),
  ),
});

/** A name no row of the map has yet: `name`, then `name2` and on. */
const freshName = (rows: readonly Partial<Pick<Row, 'name'>>[]) => {
  const names = new Set(rows.map((row) => row.name));
  let count = 1;
  while (names.has(count === 1 ? 'name' : `name${count}`)) {
    count++;
  }
  return count === 1 ? 'name' : `name${count}`;
};

/**
 * The row a field's add button creates, as the block will store it, so the form's pending edit matches the source once
 * written; undefined where the schema's empty value is stored as it is.
 */
export const newFormItem = (
  field: BlockSchema['fields'][number],
  context: BlockFormContext,
): ((values: readonly unknown[]) => unknown) | undefined => {
  switch (field.type.kind) {
    case 'list':
      return () => context.defaults.item;
    case 'map':
      return (rows) => ({ name: freshName(rows as readonly Partial<Row>[]), optional: false, value: '' });
    case 'keyed':
      return (entries) => ({
        key: mintKey(
          new Set([
            ...context.blocks.items.map(({ key }) => key),
            ...(entries as readonly Partial<Entry>[]).flatMap(({ key }) => (key ? [key] : [])),
          ]),
        ),
        text: context.defaults.entry,
      });
    default:
      return undefined;
  }
};

/**
 * The block value the form's values state. Bound text keeps the block's own, since its editors write it directly; an
 * element the form just appended (empty, past the block's own) takes a fresh name, key or starting text.
 */
export const fromFormValues = (
  schema: BlockSchema,
  value: BlockValue,
  values: Record<string, unknown>,
  context: BlockFormContext,
): BlockValue => ({
  ...value,
  fields: Object.fromEntries(
    schema.fields.map((field): [string, FieldValue | undefined] => {
      const before = value.fields[field.name];
      const current = values[formKey(field.name)];
      if (isBoundField(field, value)) {
        return [field.name, before];
      }
      if (current === undefined || current === null || (Array.isArray(current) && current.length === 0)) {
        return [field.name, undefined];
      }
      switch (field.type.kind) {
        case 'ref': {
          const ids = [current].flat().map(String).filter(Boolean);
          const names = isPickedRef(field, context.blocks) ? fromPicked(field, context, ids, strings(before)) : ids;
          return [field.name, field.type.many ? names : names[0]];
        }
        case 'list': {
          const length = strings(before).length;
          return [
            field.name,
            (current as readonly string[]).map(
              (item, index) => item || (index >= length ? context.defaults.item : item),
            ),
          ];
        }
        case 'map': {
          const rows = current as readonly Partial<Row>[];
          const kept = rows.filter((row) => row.name);
          const previous = (before ?? []) as readonly Row[];
          // A row keeps its comment: the comment of the row with its name, or, with no row added or removed, of the
          // row it renames.
          const noteOf = (row: Partial<Row>, at: number) =>
            (
              previous.find((candidate) => candidate.name === row.name) ??
              (previous.length === rows.length ? previous[at] : undefined)
            )?.note;
          return [
            field.name,
            rows.map((row, at) => {
              const note = noteOf(row, at);
              return {
                name: row.name || freshName(kept),
                optional: !!row.optional,
                value: row.value ?? '',
                ...(note && { note }),
              };
            }),
          ];
        }
        case 'keyed': {
          const own = new Map(((before ?? []) as readonly Entry[]).map((entry) => [entry.key, entry.text]));
          const taken = new Set(context.blocks.items.map(({ key }) => key));
          return [
            field.name,
            (current as readonly Partial<Entry>[]).map(({ key, text }) => {
              if (key && own.has(key)) {
                return { key, text: own.get(key)! };
              }
              const minted = key && !taken.has(key) ? key : mintKey(taken);
              taken.add(minted);
              return { key: minted, text: text || context.defaults.entry };
            }),
          ];
        }
        default:
          return [field.name, String(current)];
      }
    }),
  ),
});
