//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import type * as Spec from '@dxos/compute/Spec';
import {
  type BlockSchema,
  type Entry,
  type FieldSchema,
  type FieldValue,
  type Range,
  type Row,
  type SpecItem,
  decodeBlock,
  specItems,
} from '@dxos/deus/schema';
import { Database, Obj, type Ref, Text } from '@dxos/echo';
import { BaseError } from '@dxos/errors';
import { type Text as TextType } from '@dxos/schema';

import { type ProjectOperation } from '#types';

import { specSchemas } from '../util/spec-schemas.ts';

export class SpecBlockError extends BaseError.extend('SpecBlockError', 'Spec block operation failed.') {}

/** A spec's text with the blocks it states. */
export type SpecDocument = {
  text: TextType.Text;
  content: string;
  schemas: ReadonlyMap<string, BlockSchema>;
  items: readonly SpecItem[];
};

export const readDocument = (spec: Spec.Spec, text: TextType.Text, content = text.content): SpecDocument => {
  const schemas = specSchemas(content, spec.dialects);
  return { text, content, schemas, items: specItems(content, schemas) };
};

export const loadDocument = Effect.fnUntraced(function* (ref: Ref.Ref<Spec.Spec>) {
  const spec = yield* Database.load(ref);
  const text = yield* Database.load(spec.content);
  return { spec, document: readDocument(spec, text) };
});

/** The block a key or a positional label names. */
export const findBlock = ({ items }: SpecDocument, name: string): SpecItem | undefined =>
  items.find((item) => !item.entry && (item.key === name || item.label === name));

export const writeContent = (text: TextType.Text, content: string) => {
  Obj.update(text, (text) => {
    Text.update(text, 'content', content);
  });
};

/** A block as the operations report it; a keyed entry carries its label. */
export const toSpecBlock = ({ content, schemas, items }: SpecDocument, item: SpecItem): ProjectOperation.SpecBlock => {
  const schema = schemas.get(item.kind);
  const base = { kind: item.kind, key: item.key, ...(item.label && { label: item.label }) };
  if (!schema) {
    return { ...base, ...(item.block.title !== undefined && { title: item.block.title }), fields: {} };
  }
  const value = decodeBlock(content, item.block, schema);
  const labelOf = (key: string) =>
    items.find((candidate) => candidate.block === item.block && candidate.entry?.key === key)?.label;
  const fields = Object.fromEntries(
    schema.fields.flatMap(({ name, type }) => {
      const field = value.fields[name];
      if (field === undefined) {
        return [];
      }
      return type.kind === 'keyed' && !value.raw.includes(name)
        ? [[name, (field as readonly Entry[]).map(({ key, text }) => ({ key, label: labelOf(key), text }))]]
        : [[name, field]];
    }),
  );
  return {
    ...base,
    ...(value.title !== undefined && { title: value.title }),
    ...(value.prose !== undefined && { prose: value.prose }),
    fields,
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

/** A field value from an operation's input as its codec reads it. Keyed entries without a key take one from `mint`. */
export const coerceField = (
  field: FieldSchema,
  value: unknown,
  raw: boolean,
  mint: () => string,
): { value: FieldValue } | { problem: string } => {
  const scalar = (value: unknown) =>
    typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' ? String(value) : undefined;
  const either = (value: FieldValue | undefined, problem: string) => (value === undefined ? { problem } : { value });
  if (raw) {
    return either(scalar(value), `${field.name} takes its source text.`);
  }
  switch (field.type.kind) {
    case 'keyed':
      return either(
        Array.isArray(value) && value.every((entry) => isRecord(entry) && typeof entry.text === 'string')
          ? value.map((entry) => ({
              key: typeof entry.key === 'string' && entry.key ? entry.key : mint(),
              text: entry.text,
            }))
          : undefined,
        `${field.name} takes a list of { key, text } entries.`,
      );
    case 'map':
      return either(
        Array.isArray(value) && value.every((row) => isRecord(row) && typeof row.name === 'string')
          ? value.map((row): Row => ({
              name: row.name,
              optional: row.optional === true,
              value: scalar(row.value) ?? '',
              ...(typeof row.note === 'string' && { note: row.note }),
            }))
          : undefined,
        `${field.name} takes a list of { name, optional, value, note } rows.`,
      );
    case 'list':
      return either(
        Array.isArray(value) && value.every((item) => scalar(item) !== undefined)
          ? value.map((item) => scalar(item)!)
          : undefined,
        `${field.name} takes a list of strings.`,
      );
    case 'ref':
      return field.type.many
        ? either(
            Array.isArray(value) && value.every((item) => typeof item === 'string') ? value : undefined,
            `${field.name} takes a list of names.`,
          )
        : either(scalar(value), `${field.name} takes a name.`);
    default:
      return either(scalar(value), `${field.name} takes a string.`);
  }
};

/** `content` without the fence at `fence` and the blank lines after it. */
export const cutFence = (content: string, fence: Range): string => {
  const rest = content.slice(fence.to).replace(/^\n+/, '');
  const head = content.slice(0, fence.from);
  return rest ? head + rest : head.replace(/\n+$/, '\n');
};

/**
 * `content` with `fence` placed after the block `after` names, before the first block of `kind` for an empty `after`,
 * or after the last block of `kind` without one; at the end when there is no such block. Returns where the fence
 * starts.
 */
export const placeFence = (
  document: SpecDocument,
  fence: string,
  kind: string,
  after: string | undefined,
): { content: string; from: number } | string => {
  const { content, items } = document;
  const ofKind = items.filter((item) => !item.entry && item.kind === kind);
  const anchor = after ? findBlock(document, after) : undefined;
  if (after && !anchor) {
    return `No block ${after}.`;
  }
  if (after === '' && ofKind.length > 0) {
    const at = ofKind[0].block.fence.from;
    return { content: content.slice(0, at) + fence + '\n\n' + content.slice(at), from: at };
  }
  const previous = anchor ?? (after === undefined ? ofKind.at(-1) : undefined);
  if (previous) {
    const at = previous.block.fence.to;
    return { content: content.slice(0, at) + '\n\n' + fence + content.slice(at), from: at + 2 };
  }
  const head = content.replace(/\n*$/, '');
  const from = head ? head.length + 2 : 0;
  return { content: (head ? head + '\n\n' : '') + fence + '\n', from };
};
