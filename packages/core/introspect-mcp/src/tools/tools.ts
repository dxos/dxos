//
// Copyright 2026 DXOS.org
//

// Server-side tool wiring: pairs each `TOOL_METADATA` entry from
// @dxos/introspect-tools with a handler that closes over a live
// `Introspector` instance. The MCP server consumes this map at startup.
//
// Pure metadata + the Effect Schema → Zod adapter live upstream in
// @dxos/introspect-tools so browser consumers (`@dxos/react-ui-introspect`,
// `react-ui-form`) can render forms or browse the surface without pulling
// in node:fs, ts-morph, or the MCP SDK.

import type * as Schema from 'effect/Schema';
import type { z } from 'zod';

import type { Introspector } from '@dxos/introspect';
import {
  TOOL_METADATA,
  inputSchemaToZod as inputSchemaToZodUpstream,
  type FindSchemaUsageArgs,
  type FindSymbolArgs,
  type GetPackageArgs,
  type GetPluginArgs,
  type GetSchemaArgs,
  type GetSymbolArgs,
  type ListCapabilitiesArgs,
  type ListOperationsArgs,
  type ListOptions,
  type ListPackagesArgs,
  type ListPluginsArgs,
  type ListSchemasArgs,
  type ListSurfacesArgs,
  type ListSymbolsArgs,
  type ToolMetadata,
} from '@dxos/introspect-tools';

import type { ToolLogger } from './logger';
import {
  shapeFindSchemaUsage,
  shapeFindSymbol,
  shapeGetPackage,
  shapeGetPlugin,
  shapeGetSchema,
  shapeGetSymbol,
  shapeListCapabilities,
  shapeListOperations,
  shapeListPackages,
  shapeListPlugins,
  shapeListSchemas,
  shapeListSurfaces,
  type ToolResult,
} from './shaping';

/** A single MCP tool: static metadata + handler closing over the introspector. */
export type ToolDefinition<TArgs = Record<string, unknown>> = ToolMetadata & {
  /** Tool body. Must NOT await `introspector.ready` — the server gates that uniformly. */
  handler: (args: TArgs) => ToolResult | Promise<ToolResult>;
};

/** Pull the list-options bag out of an args object before forwarding to a shaper. */
const pickListOptions = (args: { limit?: number; compact?: boolean }): ListOptions => ({
  limit: args.limit,
  compact: args.compact,
});

/**
 * Build the tool map for a given introspector. Returns the same metadata as
 * `TOOL_METADATA` augmented with handlers that close over `introspector`
 * and `log`. Used by the MCP server; downstream UI code that doesn't need
 * to *invoke* tools should import `TOOL_METADATA` from
 * `@dxos/introspect-tools` directly.
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
      const result = introspector.listPlugins({ query: args.query, pathPrefix: args.pathPrefix });
      const shaped = shapeListPlugins(result, pickListOptions(args));
      log({ tool: 'list_plugins', args, count: result.length, truncated: shaped.truncated });
      return shaped;
    },
  } satisfies ToolDefinition<ListPluginsArgs>,

  get_plugin: {
    ...TOOL_METADATA.get_plugin,
    handler: (args: GetPluginArgs) => {
      const detail = introspector.getPlugin(args.id);
      log({ tool: 'get_plugin', args, found: detail !== null });
      if (!detail) {
        return { data: null, note: `No plugin with id ${args.id}` };
      }
      return shapeGetPlugin(detail);
    },
  } satisfies ToolDefinition<GetPluginArgs>,

  list_surfaces: {
    ...TOOL_METADATA.list_surfaces,
    handler: (args: ListSurfacesArgs) => {
      const result = introspector.listSurfaces(args.pluginId);
      const shaped = shapeListSurfaces(result, pickListOptions(args));
      log({ tool: 'list_surfaces', args, count: result.length, truncated: shaped.truncated });
      return shaped;
    },
  } satisfies ToolDefinition<ListSurfacesArgs>,

  list_capabilities: {
    ...TOOL_METADATA.list_capabilities,
    handler: (args: ListCapabilitiesArgs) => {
      const result = introspector.listCapabilities(args.pluginId);
      const shaped = shapeListCapabilities(result, pickListOptions(args));
      log({ tool: 'list_capabilities', args, count: result.length, truncated: shaped.truncated });
      return shaped;
    },
  } satisfies ToolDefinition<ListCapabilitiesArgs>,

  list_operations: {
    ...TOOL_METADATA.list_operations,
    handler: (args: ListOperationsArgs) => {
      const result = introspector.listOperations(args.pluginId);
      const shaped = shapeListOperations(result, pickListOptions(args));
      log({ tool: 'list_operations', args, count: result.length, truncated: shaped.truncated });
      return shaped;
    },
  } satisfies ToolDefinition<ListOperationsArgs>,

  list_schemas: {
    ...TOOL_METADATA.list_schemas,
    handler: (args: ListSchemasArgs) => {
      const result = introspector.listSchemas({ package: args.package, pluginId: args.pluginId });
      const shaped = shapeListSchemas(result, pickListOptions(args));
      log({ tool: 'list_schemas', args, count: result.length, truncated: shaped.truncated });
      return shaped;
    },
  } satisfies ToolDefinition<ListSchemasArgs>,

  get_schema: {
    ...TOOL_METADATA.get_schema,
    handler: (args: GetSchemaArgs) => {
      const detail = introspector.getSchema(args.typename);
      log({ tool: 'get_schema', args, found: detail !== null });
      if (!detail) {
        return { data: null, note: `No schema with typename ${args.typename}` };
      }
      return shapeGetSchema(detail);
    },
  } satisfies ToolDefinition<GetSchemaArgs>,

  find_schema_usage: {
    ...TOOL_METADATA.find_schema_usage,
    handler: (args: FindSchemaUsageArgs) => {
      const usages = introspector.findSchemaUsage(args.typename);
      const shaped = shapeFindSchemaUsage(usages, pickListOptions(args));
      log({ tool: 'find_schema_usage', args, count: usages.length, truncated: shaped.truncated });
      return shaped;
    },
  } satisfies ToolDefinition<FindSchemaUsageArgs>,
});

/**
 * Re-export for back-compat with `server.ts`. The conversion logic lives in
 * `@dxos/introspect-tools/inputSchemaToZod` (which delegates to
 * `@dxos/effect-zod`).
 */
export const inputSchemaToZod = (struct: Schema.Struct<any>): Record<string, z.ZodTypeAny> =>
  inputSchemaToZodUpstream(struct);
