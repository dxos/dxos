//
// Copyright 2026 DXOS.org
//

import { type MdlBlock, parseMdlBlocks } from '@dxos/deus/extension';

/** A top-level spec block that other blocks can depend on. */
export type DefinitionModel = {
  id: string;
  kind: string;
  title?: string;
  /** Ids of the other definitions this one names, in order of first mention. */
  dependsOn: string[];
};

/** The definitions of a spec and which name which, pointing from the dependent to what it names. */
export type DefinitionGraphModel = {
  definitions: DefinitionModel[];
  edges: { id: string; from: string; to: string }[];
};

/** One declared field: `name[?]: Type  # comment`. */
export type FieldModel = {
  name: string;
  type: string;
  optional: boolean;
  comment?: string;
};

/** Why a type is taken to be persisted. */
export type StoredReason = 'typename' | 'ref' | 'described';

export type DataTypeModel = {
  id: string;
  typename?: string;
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

/** Kinds that describe the spec's own history or language rather than the system it specifies. */
const NON_DEFINITION_KINDS = new Set(['decision', 'ext']);

/** Read from the first sentence only: later sentences tend to describe neighbouring state, not the type. */
const STORED_PROSE = /\b(persist(?:ed|ent)|stored|ECHO (?:object|relation|type|schema))\b/;

const RUNTIME_PROSE = /\b(runtime[- ]only|not a schema|not persisted)\b/i;

const firstSentence = (prose: string): string => prose.split(/(?<=\.)\s/)[0];

/** Dotted identifiers, so `CallsCapabilities.Manager` and `F-1.2` each read as one token. */
const IDENTIFIER = /[A-Za-z][\w-]*(?:\.[\w-]+)*/g;

const indentOf = (line: string): number => line.length - line.trimStart().length;

/**
 * The top-level fields of a block body: a field's inline value, or for a `|` block or nested map, its
 * indented lines with the common indent removed.
 */
export const parseFields = (body: string): Map<string, { inline?: string; lines: string[] }> => {
  const lines = body.split('\n');
  const contentIndents = lines.filter((line) => line.trim() !== '').map(indentOf);
  const base = contentIndents.length > 0 ? Math.min(...contentIndents) : 0;
  const fields = new Map<string, { inline?: string; lines: string[] }>();
  let current: { inline?: string; lines: string[] } | undefined;
  for (const line of lines) {
    if (line.trim() === '') {
      continue;
    }
    const match = indentOf(line) === base && line.trim().match(/^([\w-]+)(\??):(?:\s+(.*))?$/);
    if (match) {
      const inline = match[3]?.trim();
      current = { inline: inline && inline !== '|' && inline !== '>' ? inline : undefined, lines: [] };
      fields.set(match[1], current);
    } else if (current && indentOf(line) > base) {
      current.lines.push(line.trim());
    }
  }
  return fields;
};

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

/** `name(a: A, b?: B) → Out`; arrows may be written `→` or `->`. */
const parseSignature = (line: string): Pick<EndpointModel, 'name' | 'inputs' | 'output'> | undefined => {
  const match = line.match(/^([\w.]+)\s*\((.*?)\)\s*(?:(?:→|->)\s*(.+?))?\s*(?:#.*)?$/);
  if (!match) {
    return undefined;
  }
  const inputs = match[2]
    .split(',')
    .map((param) => parseField(param.trim()))
    .filter((field): field is FieldModel => field !== undefined);
  return { name: match[1], inputs, ...(match[3] && { output: match[3] }) };
};

const definitionBlocks = (text: string): MdlBlock[] =>
  parseMdlBlocks(text).filter(({ type, id }) => id && !NON_DEFINITION_KINDS.has(type));

/** The id a token names: itself, or the nearest enclosing id (`F-1.2` names `F-1`; `Meeting.call` names `Meeting`). */
const resolveToken = (token: string, ids: ReadonlySet<string>): string | undefined => {
  for (let candidate = token; candidate; candidate = candidate.slice(0, Math.max(candidate.lastIndexOf('.'), 0))) {
    if (ids.has(candidate)) {
      return candidate;
    }
  }
  return undefined;
};

const namedIds = (text: string, ids: ReadonlySet<string>, self?: string): string[] => [
  ...new Set(
    [...text.matchAll(IDENTIFIER)]
      .map(([token]) => resolveToken(token, ids))
      .filter((id): id is string => id !== undefined && id !== self),
  ),
];

/** Every definition of a spec with an edge to each other definition its title or body names. */
export const buildDefinitionGraph = (text: string): DefinitionGraphModel => {
  const blocks = definitionBlocks(text);
  const ids = new Set(blocks.map(({ id }) => id));
  const definitions = blocks.map(({ type, id, title, body }): DefinitionModel => ({
    id,
    kind: type,
    ...(title && { title }),
    dependsOn: namedIds(`${title ?? ''}\n${body}`, ids, id),
  }));
  return {
    definitions,
    edges: definitions.flatMap(({ id, dependsOn }) => dependsOn.map((to) => ({ id: `${id}->${to}`, from: id, to }))),
  };
};

/** A definition graph narrowed to the kinds still shown, with lookups for drawing it. */
export type DefinitionSelection = DefinitionGraphModel & {
  byId: ReadonlyMap<string, DefinitionModel>;
  /** How many shown definitions name each one. */
  dependents: ReadonlyMap<string, number>;
  /** The kinds present, in order of first definition. */
  kinds: string[];
};

/** Drops the given kinds, and every edge to or from them, from a definition graph. */
export const selectDefinitions = (
  { definitions, edges }: DefinitionGraphModel,
  exclude: Iterable<string>,
): DefinitionSelection => {
  const excluded = new Set(exclude);
  const kept = definitions.filter(({ kind }) => !excluded.has(kind));
  const byId = new Map(kept.map((definition) => [definition.id, definition]));
  const keptEdges = edges.filter(({ from, to }) => byId.has(from) && byId.has(to));
  const dependents = new Map<string, number>();
  keptEdges.forEach(({ to }) => dependents.set(to, (dependents.get(to) ?? 0) + 1));
  return {
    definitions: kept,
    edges: keptEdges,
    byId,
    dependents,
    kinds: [...new Set(kept.map(({ kind }) => kind))],
  };
};

const REFERENCE_TYPE = /\bRef<\s*([\w.]+)\s*>/;

/**
 * The persisted part of a spec's `type` blocks. A type is a stored root when it declares an ECHO `typename`,
 * holds a `Ref<…>`, or its description says it is persisted; the types the roots embed are stored inside them.
 */
export const buildDataModel = (text: string): DataModel => {
  const blocks = parseMdlBlocks(text).filter(({ type, id }) => type === 'type' && id);
  const ids = new Set(blocks.map(({ id }) => id));
  const all = blocks.map((block): DataTypeModel => {
    const fields = parseFields(block.body);
    const desc = proseOf(fields.get('desc'));
    const typename = fields.get('typename')?.inline;
    const fieldLines = fields.get('fields')?.lines ?? [];
    const declared = fieldLines
      .map(parseField)
      .filter((field): field is FieldModel => field !== undefined)
      .map((field) => ({
        ...field,
        refs: namedIds(field.type, ids, undefined),
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
              inputs: (fields.get('input')?.lines ?? [])
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
