//
// Copyright 2026 DXOS.org
//

// Effect Schema input definitions for every MCP tool.
//
// These are the source of truth: `@dxos/introspect-mcp` converts them to zod
// at registration time (the MCP SDK requires zod), and downstream consumers
// like `react-ui-form` import them directly to render forms.
//
// Convention: every field's description goes on the OUTERMOST wrapper.
//   - Optional fields: `.annotations({ description })` on `Schema.optional(...)`.
//   - Required fields: `.annotations({ description })` on the primitive itself.

import * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';

import { trim } from '@dxos/util';

import { DEFAULT_LIST_LIMIT, MAX_LIST_LIMIT } from './limits';

/**
 * Annotation key for fields whose value should be picked from a known
 * enumeration that the MCP server can produce on demand. Consumers
 * (e.g. `@dxos/react-ui-introspect`'s ToolForm) read this annotation off
 * the field's AST and render a Combobox over the matching list.
 *
 * The kind names a domain rather than a specific tool — e.g. `plugin-id`
 * means "any tool that emits plugin ids works" — so adding a new tool
 * doesn't require new picker plumbing.
 */
export const PickerAnnotationId = '@dxos/introspect-tools/picker';

export type PickerKind = 'plugin-id' | 'package-name';

export const getPicker = (ast: SchemaAST.AST): PickerKind | undefined =>
  (ast.annotations as Record<string, unknown>)[PickerAnnotationId] as PickerKind | undefined;

/**
 * Pagination + projection options shared by every list-style tool. Spread its
 * `.fields` into a tool's `Schema.Struct({...})` so the same pair of knobs
 * appears on every list endpoint without copy-paste.
 *
 * The default behavior (no `limit`, no `compact`) matches the old hard-cap-of-30
 * shape, so callers that don't pass these args see no change.
 */
export const ListOptionsInput = Schema.Struct({
  limit: Schema.optional(
    Schema.Number.pipe(Schema.int(), Schema.positive(), Schema.lessThanOrEqualTo(MAX_LIST_LIMIT)),
  ).annotations({
    title: 'Limit',
    description: trim`
      Maximum number of items. Default ${DEFAULT_LIST_LIMIT}; max ${MAX_LIST_LIMIT}.
    `,
  }),
  compact: Schema.optional(Schema.Boolean).annotations({
    title: 'Compact',
    description: trim`
      If true, returns only the most-essential identifying fields for each item — about 1/4 the response size.
      Use when discovering what exists before drilling in.
    `,
  }),
});

const SymbolKindEnum = Schema.Literal('function', 'class', 'interface', 'type', 'enum', 'variable', 'namespace');

const IncludeEnum = Schema.Literal('source', 'jsdoc');

//
// Packages
//

export const ListPackagesInput = Schema.Struct({
  name: Schema.optional(Schema.String).annotations({
    title: 'Name filter',
    description: 'Substring of the package name (case-insensitive).',
    [PickerAnnotationId]: 'package-name' satisfies PickerKind,
  }),
  pathPrefix: Schema.optional(Schema.String).annotations({
    title: 'Path prefix',
  }),
  privateOnly: Schema.optional(Schema.Boolean).annotations({
    title: 'Private only',
    description: 'If true, only include workspace-private packages.',
  }),
  ...ListOptionsInput.fields,
});

export const GetPackageInput = Schema.Struct({
  name: Schema.String.annotations({
    title: 'Package name',
    description: 'Exact package name, e.g. "@dxos/echo".',
    [PickerAnnotationId]: 'package-name' satisfies PickerKind,
  }),
});

//
// Symbols
//

export const ListSymbolsInput = Schema.Struct({
  package: Schema.String.annotations({
    title: 'Package',
    description: 'Exact package name, e.g. "@dxos/ai".',
    [PickerAnnotationId]: 'package-name' satisfies PickerKind,
  }),
  kind: Schema.optional(SymbolKindEnum).annotations({
    title: 'Kind',
    description: 'Optional filter on declaration kind.',
  }),
  ...ListOptionsInput.fields,
});

export const FindSymbolInput = Schema.Struct({
  query: Schema.String.annotations({
    title: 'Query',
    description: 'Symbol name or partial name (case-insensitive).',
  }),
  kind: Schema.optional(SymbolKindEnum).annotations({
    title: 'Kind',
    description: 'Optional filter on declaration kind.',
  }),
  ...ListOptionsInput.fields,
});

export const GetSymbolInput = Schema.Struct({
  ref: Schema.String.annotations({
    title: 'Symbol ref',
    description: 'Symbol ref in the form "<package>#<name>", e.g. "@dxos/echo#Expando".',
  }),
  include: Schema.optional(Schema.Array(IncludeEnum)).annotations({
    title: 'Include',
    description: 'Optional fields to expand; default returns signature + summary only.',
  }),
});

//
// Plugins / surfaces / capabilities / operations / schemas
//
// Main's API exposes a single optional `id` filter on each of these — the
// plugin id (e.g. "org.dxos.plugin.markdown"). `listPlugins` accepts a
// `PluginFilter` object with `id` for substring matching.
//

export const ListPluginsInput = Schema.Struct({
  // No picker annotation — this is a free-form substring filter, not an
  // exact-match selector. Picking from the list of known plugin ids would
  // defeat the purpose of `list_plugins`.
  id: Schema.optional(Schema.String).annotations({
    title: 'Plugin id',
    description: 'Substring of the plugin id (case-insensitive). Omit to list every plugin.',
  }),
  ...ListOptionsInput.fields,
});

const PluginIdFilter = Schema.Struct({
  id: Schema.optional(Schema.String).annotations({
    title: 'Plugin id',
    [PickerAnnotationId]: 'plugin-id' satisfies PickerKind,
  }),
  ...ListOptionsInput.fields,
});

export const ListSurfacesInput = PluginIdFilter;
export const ListCapabilitiesInput = PluginIdFilter;
export const ListOperationsInput = PluginIdFilter;
export const ListSchemasInput = PluginIdFilter;

//
// Idioms
//

const IdiomHostKindEnum = Schema.Literal('story', 'test', 'symbol');

export const ListIdiomsInput = Schema.Struct({
  slug: Schema.optional(Schema.String).annotations({
    title: 'Slug filter',
    description: 'Substring of the idiom slug (case-insensitive). Omit to list every idiom.',
  }),
  hostKind: Schema.optional(IdiomHostKindEnum).annotations({
    title: 'Host kind',
    description: 'Filter idioms by their host site: `symbol` (production code), `story`, or `test`.',
  }),
  ...ListOptionsInput.fields,
});

//
// Inferred TypeScript types — handy for downstream consumers.
//

export type ListPackagesArgs = typeof ListPackagesInput.Type;
export type GetPackageArgs = typeof GetPackageInput.Type;
export type ListSymbolsArgs = typeof ListSymbolsInput.Type;
export type FindSymbolArgs = typeof FindSymbolInput.Type;
export type GetSymbolArgs = typeof GetSymbolInput.Type;
export type ListPluginsArgs = typeof ListPluginsInput.Type;
export type ListSurfacesArgs = typeof ListSurfacesInput.Type;
export type ListCapabilitiesArgs = typeof ListCapabilitiesInput.Type;
export type ListOperationsArgs = typeof ListOperationsInput.Type;
export type ListSchemasArgs = typeof ListSchemasInput.Type;
export type ListIdiomsArgs = typeof ListIdiomsInput.Type;
