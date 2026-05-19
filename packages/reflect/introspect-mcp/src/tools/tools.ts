//
// Copyright 2026 DXOS.org
//

// Tool definitions — the metadata + handler body for every MCP tool the
// introspect-mcp server exposes.
//
// Centralizing this map gives us:
//
//   - One place to read when wondering "what tools does this server expose?"
//   - A simple shape for `server.ts` to iterate when registering tools, so the
//     server's only job is wiring (transport, error handling, readiness gate).
//   - A natural surface to extend without touching server-construction logic
//     — adding a tool is a single new entry in this map.
//
// Input schemas are authored in Effect Schema (see `@dxos/introspect-tools`)
// so that downstream consumers like `react-ui-form` can render forms from
// the same definitions. The MCP SDK requires zod, so the server converts at
// registration time via `inputSchemaToZod` from `@dxos/introspect-tools`.
//
// Each handler returns a `ToolResult` (data + optional note + optional
// truncated marker); the server wraps that in the MCP `content` envelope.
// Handlers DO NOT call `await introspector.ready` themselves — the server
// applies that gate uniformly via `withReady`, so a future tool can't
// accidentally skip it.

import type * as Schema from 'effect/Schema';

import type { Introspector } from '@dxos/introspect';
import {
  TOOL_METADATA,
  type FindSymbolArgs,
  type GetPackageArgs,
  type GetSymbolArgs,
  type ListCapabilitiesArgs,
  type ListIdiomsArgs,
  type ListOperationsArgs,
  type ListOptions,
  type ListPackagesArgs,
  type ListPluginsArgs,
  type ListSchemasArgs,
  type ListSurfacesArgs,
  type ListSymbolsArgs,
} from '@dxos/introspect-tools';

import type { ToolLogger } from './logger';
import {
  shapeFindSymbol,
  shapeGetPackage,
  shapeGetSymbol,
  shapeListCapabilities,
  shapeListIdioms,
  shapeListOperations,
  shapeListPackages,
  shapeListPlugins,
  shapeListSchemas,
  shapeListSurfaces,
  type ToolResult,
} from './shaping';

/** Pull the list-options bag out of an args object before forwarding to a shaper. */
const pickListOptions = (args: { limit?: number; compact?: boolean }): ListOptions => ({
  limit: args.limit,
  compact: args.compact,
});

/**
 * A single MCP tool — metadata + handler. The `inputSchema` field is the
 * Effect `Schema.Struct` that defines the input shape; the server converts
 * it to zod at registration via `effectFieldsToZod`. Authoring in Effect
 * Schema gives `react-ui-form` and other downstream consumers a single
 * source of truth.
 */
export type ToolDefinition<TArgs = Record<string, unknown>> = {
  /** Human-readable title surfaced by Inspector / Composer. */
  title: string;

  /**
   * LLM-targeted description. Models read this to decide WHEN to call the
   * tool — write it for trigger accuracy, not for human reading. State both
   * what the tool does and the situations it's the right answer for.
   */
  description: string;

  /**
   * Effect Schema struct describing the tool's input. The server converts
   * to zod for the MCP SDK; downstream consumers (react-ui-form, etc.) can
   * use this directly.
   */
  inputSchema: Schema.Struct<any>;

  /** Tool body. Must NOT await `introspector.ready` — the server gates that uniformly. */
  handler: (args: TArgs) => ToolResult | Promise<ToolResult>;
};

/**
 * Build the tool map for a given introspector. Returning a map (rather than a
 * static const) lets the handlers close over the introspector instance and
 * the per-process logger. Title / description / inputSchema all come from the
 * shared `TOOL_METADATA` map in `@dxos/introspect-tools` so the contract is
 * authored once and consumed by both server (here) and browser callers.
 */
export const createToolDefinitions = (
  introspector: Introspector,
  log: ToolLogger,
): Record<string, ToolDefinition<any>> => ({
  list_packages: {
    ...TOOL_METADATA.list_packages,
    handler: (args: ListPackagesArgs) => {
      const result = introspector.listPackages({
        name: args.name,
        pathPrefix: args.pathPrefix,
        privateOnly: args.privateOnly,
      });
      const shaped = shapeListPackages(result, pickListOptions(args));
      log({ tool: 'list_packages', args, count: result.length, truncated: shaped.truncated });
      return shaped;
    },
  } satisfies ToolDefinition<ListPackagesArgs>,

  get_package: {
    ...TOOL_METADATA.get_package,
    handler: (args: GetPackageArgs) => {
      const detail = introspector.getPackage(args.name);
      log({ tool: 'get_package', args, found: detail !== null });
      if (!detail) {
        return { data: null, note: `No package named ${args.name}` };
      }
      return shapeGetPackage(detail);
    },
  } satisfies ToolDefinition<GetPackageArgs>,

  list_symbols: {
    ...TOOL_METADATA.list_symbols,
    handler: (args: ListSymbolsArgs) => {
      const matches = introspector.listSymbols(args.package, args.kind);
      const shaped = shapeFindSymbol(matches, pickListOptions(args));
      log({ tool: 'list_symbols', args, count: matches.length, truncated: shaped.truncated });
      return shaped;
    },
  } satisfies ToolDefinition<ListSymbolsArgs>,

  find_symbol: {
    ...TOOL_METADATA.find_symbol,
    handler: (args: FindSymbolArgs) => {
      const matches = introspector.findSymbol(args.query, args.kind);
      const shaped = shapeFindSymbol(matches, pickListOptions(args));
      log({ tool: 'find_symbol', args, count: matches.length, truncated: shaped.truncated });
      return shaped;
    },
  } satisfies ToolDefinition<FindSymbolArgs>,

  get_symbol: {
    ...TOOL_METADATA.get_symbol,
    handler: (args: GetSymbolArgs) => {
      const detail = introspector.getSymbol(args.ref, args.include as Array<'source' | 'jsdoc'> | undefined);
      log({ tool: 'get_symbol', args, found: detail !== null });
      if (!detail) {
        return { data: null, note: `No symbol with ref ${args.ref}` };
      }
      return shapeGetSymbol(detail);
    },
  } satisfies ToolDefinition<GetSymbolArgs>,

  list_plugins: {
    ...TOOL_METADATA.list_plugins,
    handler: (args: ListPluginsArgs) => {
      const result = introspector.listPlugins(args.id !== undefined ? { id: args.id } : undefined);
      const shaped = shapeListPlugins(result, pickListOptions(args));
      log({ tool: 'list_plugins', args, count: result.length, truncated: shaped.truncated });
      return shaped;
    },
  } satisfies ToolDefinition<ListPluginsArgs>,

  list_surfaces: {
    ...TOOL_METADATA.list_surfaces,
    handler: (args: ListSurfacesArgs) => {
      const result = introspector.listSurfaces(args.id);
      const shaped = shapeListSurfaces(result, pickListOptions(args));
      log({ tool: 'list_surfaces', args, count: result.length, truncated: shaped.truncated });
      return shaped;
    },
  } satisfies ToolDefinition<ListSurfacesArgs>,

  list_capabilities: {
    ...TOOL_METADATA.list_capabilities,
    handler: (args: ListCapabilitiesArgs) => {
      const result = introspector.listCapabilities(args.id);
      const shaped = shapeListCapabilities(result, pickListOptions(args));
      log({ tool: 'list_capabilities', args, count: result.length, truncated: shaped.truncated });
      return shaped;
    },
  } satisfies ToolDefinition<ListCapabilitiesArgs>,

  list_operations: {
    ...TOOL_METADATA.list_operations,
    handler: (args: ListOperationsArgs) => {
      const result = introspector.listOperations(args.id);
      const shaped = shapeListOperations(result, pickListOptions(args));
      log({ tool: 'list_operations', args, count: result.length, truncated: shaped.truncated });
      return shaped;
    },
  } satisfies ToolDefinition<ListOperationsArgs>,

  list_schemas: {
    ...TOOL_METADATA.list_schemas,
    handler: (args: ListSchemasArgs) => {
      const result = introspector.listSchemas(args.id);
      const shaped = shapeListSchemas(result, pickListOptions(args));
      log({ tool: 'list_schemas', args, count: result.length, truncated: shaped.truncated });
      return shaped;
    },
  } satisfies ToolDefinition<ListSchemasArgs>,

  list_idioms: {
    ...TOOL_METADATA.list_idioms,
    handler: (args: ListIdiomsArgs) => {
      const result = introspector.listIdioms({ slug: args.slug, hostKind: args.hostKind });
      const shaped = shapeListIdioms(result, pickListOptions(args));
      log({ tool: 'list_idioms', args, count: result.length, truncated: shaped.truncated });
      return shaped;
    },
  } satisfies ToolDefinition<ListIdiomsArgs>,
});
