//
// Copyright 2026 DXOS.org
//

// Effect Schema input definitions for every MCP tool.
//
// These are the source of truth: `tools.ts` converts them to zod at registration
// time (the MCP SDK requires zod), and downstream consumers like
// `react-ui-form` can import them directly to render forms.
//
// Convention: every field's description goes on the OUTERMOST wrapper.
//   - Optional fields: `.annotations({ description })` on `Schema.optional(...)`.
//   - Required fields: `.annotations({ description })` on the primitive itself.
//
// Skipping a description leaves the field labeled with Effect's stdlib default
// ("a string", "a number") which is unhelpful for LLM trigger accuracy and
// confusing in form UIs. Always supply one.

import * as Schema from 'effect/Schema';

import { trim } from '@dxos/util';

import { DEFAULT_LIST_LIMIT, MAX_LIST_LIMIT } from './shaping';

/**
 * Pagination + projection options shared by every list-style tool. Spread its
 * `.fields` into a tool's `Schema.Struct({...})` so the same pair of knobs
 * appears on every list endpoint without copy-paste.
 */
export const ListOptionsInput = Schema.Struct({
  limit: Schema.optional(
    Schema.Number.pipe(Schema.int(), Schema.positive(), Schema.lessThanOrEqualTo(MAX_LIST_LIMIT)),
  ).annotations({
    description: trim`
      Maximum number of items to return. Default ${DEFAULT_LIST_LIMIT}; max ${MAX_LIST_LIMIT}.
    `,
  }),
  compact: Schema.optional(Schema.Boolean).annotations({
    description: trim`
      If true, returns only the most-essential identifying fields (ref, id, name) for each item —
      about 1/4 the response size. Use when discovering what exists before drilling in with a get_* call.
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
    description: 'Substring of the package name (case-insensitive).',
  }),
  pathPrefix: Schema.optional(Schema.String).annotations({
    description: 'Restrict to packages whose path starts with this segment, e.g. "packages/plugins".',
  }),
  privateOnly: Schema.optional(Schema.Boolean).annotations({
    description: 'If true, only include workspace-private packages.',
  }),
  ...ListOptionsInput.fields,
});

export const GetPackageInput = Schema.Struct({
  name: Schema.String.annotations({ description: 'Exact package name, e.g. "@dxos/echo".' }),
});

//
// Symbols
//

export const ListSymbolsInput = Schema.Struct({
  package: Schema.String.annotations({ description: 'Exact package name, e.g. "@dxos/ai".' }),
  kind: Schema.optional(SymbolKindEnum).annotations({ description: 'Optional filter on declaration kind.' }),
  ...ListOptionsInput.fields,
});

export const FindSymbolInput = Schema.Struct({
  query: Schema.String.annotations({ description: 'Symbol name or partial name (case-insensitive).' }),
  kind: Schema.optional(SymbolKindEnum).annotations({ description: 'Optional filter on declaration kind.' }),
  ...ListOptionsInput.fields,
});

export const GetSymbolInput = Schema.Struct({
  ref: Schema.String.annotations({
    description: 'Symbol ref in the form "<package>#<name>", e.g. "@dxos/echo#Expando".',
  }),
  include: Schema.optional(Schema.Array(IncludeEnum)).annotations({
    description: 'Optional fields to expand; default returns signature + summary only.',
  }),
});

//
// Plugins / surfaces / capabilities / operations
//

export const ListPluginsInput = Schema.Struct({
  query: Schema.optional(Schema.String).annotations({
    description: 'Substring of the plugin id, name, or owning package name (case-insensitive).',
  }),
  pathPrefix: Schema.optional(Schema.String).annotations({
    description: 'Restrict to plugins whose owning package starts with this path, e.g. "packages/plugins".',
  }),
  ...ListOptionsInput.fields,
});

export const GetPluginInput = Schema.Struct({
  id: Schema.String.annotations({ description: 'Plugin id from meta.ts, e.g. "org.dxos.plugin.markdown".' }),
});

export const ListSurfacesInput = Schema.Struct({
  pluginId: Schema.optional(Schema.String).annotations({
    description: 'Restrict to surfaces contributed by this plugin id.',
  }),
  ...ListOptionsInput.fields,
});

export const ListCapabilitiesInput = Schema.Struct({
  pluginId: Schema.optional(Schema.String).annotations({
    description: 'Restrict to capabilities contributed by this plugin id.',
  }),
  ...ListOptionsInput.fields,
});

export const ListOperationsInput = Schema.Struct({
  pluginId: Schema.optional(Schema.String).annotations({
    description: 'Restrict to operations defined within this plugin id.',
  }),
  ...ListOptionsInput.fields,
});

//
// Schemas
//

export const ListSchemasInput = Schema.Struct({
  pluginId: Schema.optional(Schema.String).annotations({
    description:
      'Restrict to schemas defined in a package that declares this plugin id, e.g. "org.dxos.plugin.markdown".',
  }),
  package: Schema.optional(Schema.String).annotations({
    description: 'Restrict to schemas defined within this exact package name.',
  }),
  ...ListOptionsInput.fields,
});

export const GetSchemaInput = Schema.Struct({
  typename: Schema.String.annotations({
    description: 'Schema typename, e.g. "org.dxos.type.document".',
  }),
});

export const FindSchemaUsageInput = Schema.Struct({
  typename: Schema.String.annotations({
    description: 'Schema typename, e.g. "org.dxos.type.document".',
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
export type GetPluginArgs = typeof GetPluginInput.Type;
export type ListSurfacesArgs = typeof ListSurfacesInput.Type;
export type ListCapabilitiesArgs = typeof ListCapabilitiesInput.Type;
export type ListOperationsArgs = typeof ListOperationsInput.Type;
export type ListSchemasArgs = typeof ListSchemasInput.Type;
export type GetSchemaArgs = typeof GetSchemaInput.Type;
export type FindSchemaUsageArgs = typeof FindSchemaUsageInput.Type;
