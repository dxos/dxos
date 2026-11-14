//
// Copyright 2026 DXOS.org
//

import { type MdlBlock, parseMdlBlocks } from '@dxos/deus/extension';
import { parseFields } from '@dxos/deus/review';
import * as SpecModel from '@dxos/plugin-projects/SpecModel';

/** One declared field: `name[?]: Type  # comment`. */
export type FieldModel = {
  name: string;
  type: string;
  optional: boolean;
  comment?: string;
};

/** Why a type is taken to be persisted; `table` is a SQL table (`lang/sql.mdl`), stored by definition. */
export type StoredReason = 'typename' | 'ref' | 'described' | 'table';

export type DataTypeModel = {
  id: string;
  typename?: string;
  /** A SQL table's database and migration-history table, from its `store:` field. */
  store?: string;
  desc?: string;
  fields: (FieldModel & {
    /** Spec types the field's type names. */
    refs: string[];
    /** Whether the field holds a reference to a separate object rather than an embedded value. */
    reference: boolean;
  })[];
  literals: string[];
  /** The types a tagged union is one of. */
  variants: string[];
  /** Base types, from `extends:` or a `...Base` spread in `fields:`. */
  bases: string[];
  /** Set on a stored root; an embedded type is stored only as part of the roots that hold it. */
  stored?: StoredReason;
};

/** A field embeds or references another type, a union lists a variant, or a type spreads or extends a base. */
export type DataModelEdgeKind = 'embeds' | 'references' | 'variant' | 'extends';

export type DataModelEdge = { id: string; kind: DataModelEdgeKind; from: string; to: string; field?: string };

/** The persisted types of a spec: stored roots and the value types they embed, linked field to type. */
export type DataModel = {
  types: DataTypeModel[];
  edges: DataModelEdge[];
};

export type ErrorModel = { name: string; desc?: string };

/** One callable entry point: an `op` block, or one method of a `service` block. */
export type EndpointModel = {
  id: string;
  name: string;
  /** The service the method belongs to; absent for an `op`. */
  service?: string;
  /** The invocation key, for an op that has one. */
  key?: string;
  desc?: string;
  inputs: FieldModel[];
  output?: string;
  /** A service event rather than a call. */
  event?: boolean;
};

export type ApiGroupModel = {
  id: string;
  kind: 'op' | 'service';
  desc?: string;
  endpoints: EndpointModel[];
  effects: string[];
  requires: string[];
  errors: ErrorModel[];
};

/** The callable surface of a spec: its operations, then its services with their methods and events. */
export type ApiModel = {
  groups: ApiGroupModel[];
  /** Every effect any group declares, in order of first mention, for the effect columns. */
  effects: string[];
  /** Spec type names, so signatures can mark the types the spec itself declares. */
  types: string[];
};

/** Read from the first sentence only: later sentences tend to describe neighbouring state, not the type. */
const STORED_PROSE = /\b(persist(?:ed|ent)|stored|ECHO (?:object|relation|type|schema))\b/;

const RUNTIME_PROSE = /\b(runtime[- ]only|not a schema|not persisted)\b/i;

const firstSentence = (prose: string): string => prose.split(/(?<=\.)\s/)[0];

const proseOf = (field?: { inline?: string; lines: string[] }): string | undefined => {
  const text = [field?.inline, ...(field?.lines ?? [])].filter(Boolean).join(' ').trim();
  return text || undefined;
};

/** `name[?]: Type  # comment`; a line without a type (a method signature) yields nothing. */
export const parseField = (line: string): FieldModel | undefined => {
  const match = line.match(/^([\w-]+)(\??):\s*(.*?)\s*(?:#\s*(.*))?$/);
  return match && match[3]
    ? { name: match[1], optional: match[2] === '?', type: match[3], ...(match[4] && { comment: match[4] }) }
    : undefined;
};

/** An op's `input` as one field per line, whether written as indented lines or inline as `{ a: A, b?: B }`. */
const inputLines = (field?: { inline?: string; lines: string[] }): string[] => {
  const inline = field?.inline?.trim().match(/^\{(.*)\}$/)?.[1];
  return [...(inline ? splitTopLevel(inline).map((part) => part.trim()) : []), ...(field?.lines ?? [])];
};

const parseList = (value?: string): string[] =>
  value
    ?.replace(/^\[|\]$/g, '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean) ?? [];

const parseErrors = (field?: { inline?: string; lines: string[] }): ErrorModel[] => [
  ...parseList(field?.inline).map((name) => ({ name })),
  ...(field?.lines ?? []).flatMap((line) => {
    const match = line.match(/^-?\s*([\w.-]+)(?::\s*(.*))?$/);
    return match ? [{ name: match[1], ...(match[2] && { desc: match[2] }) }] : [];
  }),
];

const OPENERS = '<([{';
const CLOSERS = '>)]}';

/** Splits on commas outside brackets, so a parameter typed `Map<string, Participant>` stays whole. */
export const splitTopLevel = (text: string): string[] => {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  [...text].forEach((char, index) => {
    if (OPENERS.includes(char)) {
      depth++;
    } else if (CLOSERS.includes(char) && !(char === '>' && '-='.includes(text[index - 1] ?? ''))) {
      depth = Math.max(0, depth - 1);
    } else if (char === ',' && depth === 0) {
      parts.push(text.slice(start, index));
      start = index + 1;
    }
  });
  parts.push(text.slice(start));
  return parts;
};

/** `name(a: A, b?: B) → Out`; arrows may be written `→` or `->`. */
const parseSignature = (line: string): Pick<EndpointModel, 'name' | 'inputs' | 'output'> | undefined => {
  const match = line.match(/^([\w.]+)\s*\((.*?)\)\s*(?:(?:→|->)\s*(.+?))?\s*(?:#.*)?$/);
  if (!match) {
    return undefined;
  }
  const inputs = splitTopLevel(match[2])
    .map((param) => parseField(param.trim()))
    .filter((field): field is FieldModel => field !== undefined);
  return { name: match[1], inputs, ...(match[3] && { output: match[3] }) };
};

const REFERENCE_TYPE = /\bRef<\s*([\w.]+)\s*>/;

/** A column's foreign key, `REFERENCES <table>(<column>)`. */
const SQL_REFERENCE = /\bREFERENCES\s+([\w.]+)\s*\(/i;

/**
 * The persisted part of a spec's `type` and `table` blocks. A type is a stored root when it declares an ECHO
 * `typename`, holds a `Ref<…>`, or its description says it is persisted; the types the roots embed are stored inside
 * them. A table is always a stored root, its columns are its fields, and a `REFERENCES` column references a table.
 */
export const buildDataModel = (text: string): DataModel => {
  const parsed = parseMdlBlocks(text);
  const blocks = parsed.filter(({ type, id }) => type === 'type' && id);
  const tables = parsed.filter(({ type, id }) => type === 'table' && id);
  const ids = new Set(blocks.map(({ id }) => id));
  const tableIds = new Set(tables.map(({ id }) => id));
  const tableModels = tables.map((block): DataTypeModel => {
    const fields = parseFields(block.body);
    const store = fields.get('store')?.inline;
    return {
      id: block.id,
      ...(store && { store }),
      ...(block.title && { desc: block.title }),
      fields: (fields.get('columns')?.lines ?? [])
        .map(parseField)
        .filter((field): field is FieldModel => field !== undefined)
        .map((field) => {
          const target = field.type.match(SQL_REFERENCE)?.[1];
          return { ...field, refs: target && tableIds.has(target) ? [target] : [], reference: target !== undefined };
        }),
      literals: [],
      variants: [],
      bases: [],
      stored: 'table',
    };
  });
  const typeModels = blocks.map((block): DataTypeModel => {
    const fields = parseFields(block.body);
    const desc = proseOf(fields.get('desc'));
    const typename = fields.get('typename')?.inline;
    const fieldLines = fields.get('fields')?.lines ?? [];
    const declared = fieldLines
      .map(parseField)
      .filter((field): field is FieldModel => field !== undefined)
      .map((field) => ({
        ...field,
        refs: SpecModel.namedIds(field.type, ids, undefined),
        reference: REFERENCE_TYPE.test(field.type),
      }));
    const lead = desc && firstSentence(desc);
    const runtime = lead !== undefined && RUNTIME_PROSE.test(lead);
    const stored: StoredReason | undefined = typename
      ? 'typename'
      : runtime
        ? undefined
        : declared.some(({ reference }) => reference)
          ? 'ref'
          : lead && STORED_PROSE.test(lead)
            ? 'described'
            : undefined;
    return {
      id: block.id,
      ...(typename && { typename }),
      ...(desc && { desc }),
      fields: declared,
      literals: parseList(fields.get('literals')?.inline?.replaceAll('|', ',')),
      variants: (fields.get('union')?.lines ?? [])
        .map((line) => line.replace(/^-\s*/, ''))
        .filter((variant) => ids.has(variant)),
      bases: [
        ...parseList(fields.get('extends')?.inline),
        ...fieldLines.flatMap((line) => line.match(/^\.\.\.([\w.]+)/)?.[1] ?? []),
      ].filter((base) => ids.has(base)),
      ...(stored && { stored }),
    };
  });

  const all = [...typeModels, ...tableModels];
  const byId = new Map(all.map((type) => [type.id, type]));
  const kept = new Set<string>();
  const visit = (id: string) => {
    if (!kept.has(id)) {
      kept.add(id);
      byId.get(id)?.fields.forEach(({ refs }) => refs.forEach(visit));
      byId.get(id)?.variants.forEach(visit);
      byId.get(id)?.bases.forEach(visit);
    }
  };
  all.filter(({ stored }) => stored).forEach(({ id }) => visit(id));

  const types = all.filter(({ id }) => kept.has(id));
  return {
    types,
    edges: types.flatMap(({ id, fields, variants, bases }): DataModelEdge[] => [
      ...fields.flatMap(({ name, refs, reference }) =>
        refs.map((ref): DataModelEdge => ({
          id: `${id}.${name}->${ref}`,
          kind: reference ? 'references' : 'embeds',
          from: id,
          to: ref,
          field: name,
        })),
      ),
      ...variants.map((variant): DataModelEdge => ({ id: `${id}|${variant}`, kind: 'variant', from: id, to: variant })),
      ...bases.map((base): DataModelEdge => ({ id: `${id}^${base}`, kind: 'extends', from: id, to: base })),
    ]),
  };
};

/** The `op` blocks of a spec, then its `service` blocks with their methods and events. */
export const buildApiModel = (text: string): ApiModel => {
  const blocks = parseMdlBlocks(text);
  const types = blocks.filter(({ type, id }) => type === 'type' && id).map(({ id }) => id);
  const groups = blocks
    .filter((block): block is MdlBlock & { type: 'op' | 'service' } =>
      Boolean(block.id && (block.type === 'op' || block.type === 'service')),
    )
    .map((block): ApiGroupModel => {
      const fields = parseFields(block.body);
      const desc = proseOf(fields.get('desc'));
      const common = {
        id: block.id,
        kind: block.type,
        ...(desc && { desc }),
        effects: parseList(fields.get('effects')?.inline),
        requires: parseList(fields.get('requires')?.inline),
        errors: parseErrors(fields.get('errors')),
      };
      if (block.type === 'op') {
        const key = fields.get('key')?.inline;
        const output = proseOf(fields.get('output'));
        return {
          ...common,
          endpoints: [
            {
              id: block.id,
              name: block.id,
              ...(key && { key }),
              ...(desc && { desc }),
              inputs: inputLines(fields.get('input'))
                .map(parseField)
                .filter((field): field is FieldModel => field !== undefined),
              ...(output && { output }),
            },
          ],
        };
      }
      const methods = (field: string, event: boolean) =>
        (fields.get(field)?.lines ?? []).flatMap((line) => {
          const signature = parseSignature(line);
          return signature
            ? [{ id: `${block.id}.${signature.name}`, service: block.id, ...signature, ...(event && { event }) }]
            : [];
        });
      return { ...common, endpoints: [...methods('ops', false), ...methods('events', true)] };
    });

  return { groups, effects: [...new Set(groups.flatMap(({ effects }) => effects))], types };
};
