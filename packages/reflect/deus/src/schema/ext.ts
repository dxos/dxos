//
// Copyright 2026 DXOS.org
//

import { parseFieldType } from './field-type.ts';
import { type SourceBlock, type SourceField, parseSourceBlocks } from './source.ts';
import { BLOCK_ROLES, type BlockRole, type BlockSchema, type FieldSchema } from './types.ts';

/** An `ext` block as declared, before `extends` is resolved. */
export type ExtDefinition = Omit<BlockSchema, 'fields' | 'role' | 'inlineProse'> & {
  role?: BlockRole;
  inlineProse?: boolean;
  extends?: string;
  fields: readonly FieldSchema[];
  addsFields: readonly FieldSchema[];
};

/** One `FieldMap` row: `name[?]: TypeExpr  # doc`. */
const ROW = /^([\w-]+)(\?)?:[ \t]*(.*?)[ \t]*(?:#[ \t]*(.*?))?[ \t]*$/;

/** A field's value as one string: its inline text, else its lines joined. */
const valueOf = (field: SourceField | undefined): string | undefined => {
  if (!field) {
    return undefined;
  }
  if (field.inline.text) {
    return field.inline.text.replace(/[ \t]+#.*$/, '');
  }
  return field.lines
    .map((line) => line.text.trim())
    .join(' ')
    .trim();
};

const rowsOf = (field: SourceField | undefined): FieldSchema[] =>
  (field?.lines ?? []).flatMap((line) => {
    const row = line.text.trim().match(ROW);
    if (!row) {
      return [];
    }
    const [, name, optional, expr, doc] = row;
    return [{ name, optional: Boolean(optional), type: parseFieldType(expr), expr, ...(doc && { doc }) }];
  });

const toDefinition = (block: SourceBlock, dialect: string): ExtDefinition | undefined => {
  const get = (name: string) => block.fields.find((field) => field.name === name);
  const uri = valueOf(get('uri'));
  if (block.kind !== 'ext' || !block.id || !uri) {
    return undefined;
  }
  const role = valueOf(get('role')) as BlockRole | undefined;
  const inlineProse = valueOf(get('inline-prose'));
  const label = valueOf(get('label'));
  const hue = valueOf(get('hue'));
  const icon = valueOf(get('icon'));
  const parent = valueOf(get('extends'));
  return {
    kind: block.id,
    uri,
    dialect,
    desc: valueOf(get('desc')) ?? '',
    ...(role && BLOCK_ROLES.includes(role) && { role }),
    ...(inlineProse !== undefined && { inlineProse: inlineProse === 'true' }),
    ...(label && { label }),
    ...(hue && { hue }),
    ...(icon && { icon }),
    ...(parent && { extends: parent }),
    fields: rowsOf(get('fields')),
    addsFields: rowsOf(get('adds-fields')),
  };
};

/** The `ext` blocks of a dialect or spec text, in document order. */
export const parseExtDefinitions = (text: string, dialect = ''): ExtDefinition[] =>
  parseSourceBlocks(text).flatMap((block) => {
    const definition = toDefinition(block, dialect);
    return definition ? [definition] : [];
  });

/**
 * A definition with its `extends` chain merged in: the parent's fields, then the child's own (a field
 * the child redeclares replaces the parent's), then `adds-fields`. Presentation fields are inherited
 * unless the child sets them.
 */
export const resolveDefinition = (
  definition: ExtDefinition,
  /** The definition a kind name resolves to, other than the one with URI `except`. */
  lookup: (kind: string, except: string) => ExtDefinition | undefined,
  seen: ReadonlySet<string> = new Set(),
): BlockSchema => {
  const parentDefinition = definition.extends ? lookup(definition.extends, definition.uri) : undefined;
  const parent =
    parentDefinition && !seen.has(parentDefinition.uri)
      ? resolveDefinition(parentDefinition, lookup, new Set([...seen, definition.uri]))
      : undefined;
  const own = [...definition.fields, ...definition.addsFields];
  const inherited = parent?.fields ?? [];
  const fields = [
    ...inherited.map((field) => own.find(({ name }) => name === field.name) ?? field),
    ...own.filter(({ name }) => !inherited.some((field) => field.name === name)),
  ];
  const label = definition.label ?? parent?.label;
  const hue = definition.hue ?? parent?.hue;
  const icon = definition.icon ?? parent?.icon;
  return {
    kind: definition.kind,
    uri: definition.uri,
    dialect: definition.dialect,
    desc: definition.desc || parent?.desc || '',
    role: definition.role ?? parent?.role ?? 'structure',
    ...(label && { label }),
    ...(hue && { hue }),
    ...(icon && { icon }),
    inlineProse: definition.inlineProse ?? parent?.inlineProse ?? false,
    fields,
  };
};
