//
// Copyright 2026 DXOS.org
//

import { DIALECTS } from '../dialect/dialects.ts';
import { type ExtDefinition, parseExtDefinitions, resolveDefinition } from './ext.ts';
import { type BlockSchema, type FieldSchema } from './types.ts';

/** Dialect texts by frontmatter id. */
export type DialectRegistry = ReadonlyMap<string, string>;

/** The dialects `lang/` defines. */
export const STANDARD_DIALECTS: DialectRegistry = DIALECTS;

/** The dialect a package spec extends for its standard blocks. */
export const SOFTWARE_DIALECT = 'org.dxos.spec.software';

/** A document's frontmatter `id` and `extends` list (inline `[a, b]` or one `- id` per line). */
export const parseDialectHeader = (text: string): { id?: string; extends: string[] } => {
  const frontmatter = text.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '';
  const id = frontmatter.match(/^id:[ \t]*(\S+)/m)?.[1];
  const inline = frontmatter.match(/^extends:[ \t]*\[(.*)\]/m)?.[1];
  const list = frontmatter.match(/^extends:[ \t]*\n((?:[ \t]+-.*\n?)*)/m)?.[1];
  const single = frontmatter.match(/^extends:[ \t]*([^\s[].*?)\s*$/m)?.[1];
  const ids = inline
    ? inline.split(',')
    : list
      ? list.split('\n').map((line) => line.replace(/^[ \t]*-[ \t]*/, ''))
      : single
        ? [single]
        : [];
  return { ...(id && { id }), extends: ids.map((entry) => entry.trim()).filter(Boolean) };
};

/** The dialects `ids` reach through their `extends`, ancestors first, each once. */
const reach = (ids: readonly string[], registry: DialectRegistry): string[] => {
  const order: string[] = [];
  const visit = (id: string, path: ReadonlySet<string>) => {
    const text = registry.get(id);
    if (order.includes(id) || path.has(id) || text === undefined) {
      return;
    }
    for (const parent of parseDialectHeader(text).extends) {
      visit(parent, new Set([...path, id]));
    }
    order.push(id);
  };
  ids.forEach((id) => visit(id, new Set()));
  return order;
};

export type ResolveOptions = {
  /** The dialects the spec extends; defaults to its frontmatter `extends`. */
  dialects?: readonly string[];
  /** Where dialect ids resolve; defaults to {@link STANDARD_DIALECTS}. */
  registry?: DialectRegistry;
};

/**
 * Every block kind a spec can use: the `ext` blocks of the dialects it extends (and theirs), then its
 * own appendix's, a later definition of a kind replacing an earlier one.
 */
export const resolveBlockSchemas = (
  text: string,
  { dialects, registry = STANDARD_DIALECTS }: ResolveOptions = {},
): ReadonlyMap<string, BlockSchema> => {
  const definitions: ExtDefinition[] = [
    ...reach(dialects ?? parseDialectHeader(text).extends, registry).flatMap((id) =>
      parseExtDefinitions(registry.get(id)!, id),
    ),
    ...parseExtDefinitions(text),
  ];
  const lookup = (kind: string, child: ExtDefinition) =>
    definitions.slice(0, definitions.indexOf(child)).findLast((definition) => definition.kind === kind);
  const schemas = new Map<string, BlockSchema>();
  for (const definition of definitions) {
    schemas.set(definition.kind, resolveDefinition(definition, lookup));
  }
  return schemas;
};

/** The `## Extensions` table a spec's resolved kinds state: each term with its URI, `ext` itself left out. */
export const extensionTable = (schemas: ReadonlyMap<string, BlockSchema>): { term: string; uri: string }[] =>
  [...schemas.values()].filter(({ kind }) => kind !== 'ext').map(({ kind, uri }) => ({ term: kind, uri }));

/** The table as Markdown, in the column layout the language's own files use. */
export const printExtensionTable = (rows: readonly { term: string; uri: string }[]): string => {
  const cells = rows.map(({ term, uri }) => [`\`${term}\``, `\`${uri}\``]);
  const widths = [0, 1].map((column) => Math.max(column === 0 ? 4 : 3, ...cells.map((row) => row[column].length)));
  const line = (row: readonly string[]) => `| ${row.map((cell, column) => cell.padEnd(widths[column])).join(' | ')} |`;
  return [
    line(['Term', 'URI']),
    `| ${widths.map((width) => '-'.repeat(width)).join(' | ')} |`,
    ...cells.map(line),
  ].join('\n');
};

/** The fields of a kind that are keyed lines (`req <key>: prose`). */
export const keyedFields = (schema: BlockSchema | undefined): ReadonlySet<string> =>
  new Set((schema?.fields ?? []).filter(({ type }) => type.kind === 'keyed').map(({ name }) => name));

/** A field of a kind by name. */
export const fieldOf = (schema: BlockSchema | undefined, name: string): FieldSchema | undefined =>
  schema?.fields.find((field) => field.name === name);
