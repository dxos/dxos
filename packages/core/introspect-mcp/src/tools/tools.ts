//
// Copyright 2026 DXOS.org
//

// Tool definitions — the metadata + handler body for every MCP tool the
// introspect-mcp server exposes.
//
// Authoring is split:
//
//   - `TOOL_METADATA` — pure data (title, description, Effect Schema input).
//     No introspector or runtime state, no handler. This is what
//     downstream consumers (`react-ui-introspect`, react-ui-form, custom
//     UIs) import to render forms or browse the surface.
//
//   - `createToolDefinitions(introspector, log)` — pairs each metadata entry
//     with a handler that closes over the live introspector. The MCP server
//     consumes this to register tools.
//
// Input schemas live in `./schemas.ts`. The MCP SDK requires zod, so the
// server converts at registration time via `inputSchemaToZod`.

import * as Schema from 'effect/Schema';
import type { z } from 'zod';

import { effectFieldsToZod } from '@dxos/effect-zod';
import type { Introspector } from '@dxos/introspect';
import { trim } from '@dxos/util';

import type { ToolLogger } from './logger';
import {
  FindSchemaUsageInput,
  FindSymbolInput,
  GetPackageInput,
  GetPluginInput,
  GetSchemaInput,
  GetSymbolInput,
  ListCapabilitiesInput,
  ListOperationsInput,
  ListPackagesInput,
  ListPluginsInput,
  ListSchemasInput,
  ListSurfacesInput,
  ListSymbolsInput,
  type FindSchemaUsageArgs,
  type FindSymbolArgs,
  type GetPackageArgs,
  type GetPluginArgs,
  type GetSchemaArgs,
  type GetSymbolArgs,
  type ListCapabilitiesArgs,
  type ListOperationsArgs,
  type ListPackagesArgs,
  type ListPluginsArgs,
  type ListSchemasArgs,
  type ListSurfacesArgs,
  type ListSymbolsArgs,
} from './schemas';
import {
  type ListOptions,
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

/**
 * Pure metadata for a single MCP tool — what an MCP client needs to know
 * before invoking it: human-readable title, an LLM-targeted description,
 * and the Effect Schema input contract. Importable from
 * `@dxos/introspect-mcp/tools` without instantiating an introspector.
 */
export type ToolMetadata = {
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
};

/**
 * Static metadata for every tool the server exposes. No introspector or
 * runtime state — safe to import from a browser bundle.
 *
 * Adding a tool means: (1) define its input schema in `./schemas.ts`,
 * (2) add an entry here, (3) add a matching handler in
 * `createToolDefinitions` below.
 */
export const TOOL_METADATA: Record<string, ToolMetadata> = {
  list_packages: {
    title: 'List monorepo packages',
    description: trim`
      List packages in the DXOS monorepo. Use this to discover what packages exist before drilling into one.
      Supports filtering by name substring, path prefix (e.g. "packages/plugins"), or workspace-private only.
      Returns lightweight rows; call get_package for dependency and entry-point detail.
    `,
    inputSchema: ListPackagesInput,
  },
  get_package: {
    title: 'Get package detail',
    description: trim`
      Fetch the full record for a single package by its name (e.g. "@dxos/echo").
      Returns workspace and external dependencies, entry points, and metadata.
      Use after list_packages or when the user references a package directly.
    `,
    inputSchema: GetPackageInput,
  },
  list_symbols: {
    title: 'List all exported symbols of a package',
    description: trim`
      Enumerate every exported symbol declared by a single package (e.g. all exports of "@dxos/echo-react").
      Use this when the user wants to know what a specific package offers, or to browse a package after get_package.
      Returns lightweight rows with refs you can pass to get_symbol; capped at 30 — refine with \`kind\` or call get_symbol directly.
    `,
    inputSchema: ListSymbolsInput,
  },
  find_symbol: {
    title: 'Find an exported symbol by name',
    description: trim`
      Find an exported symbol (function, class, type, hook, schema) by name or partial name across all DXOS packages.
      Use this when the user references something by name and you need to locate which package owns it before reading more.
      Returns refs you can pass to get_symbol. Ranking: exact match, then prefix, then substring.
    `,
    inputSchema: FindSymbolInput,
  },
  get_symbol: {
    title: 'Get symbol detail',
    description: trim`
      Fetch detail for a single symbol by ref (e.g. "@dxos/echo#Expando").
      Default response is signature + JSDoc summary + source location.
      Pass include=["source"] to expand the full declaration text, include=["jsdoc"] for the full JSDoc body.
    `,
    inputSchema: GetSymbolInput,
  },
  list_plugins: {
    title: 'List Composer plugins',
    description: trim`
      List plugins detected in the monorepo. A plugin is a package whose src/ contains a \`Plugin.define(meta)\` call
      and a meta.ts exporting \`Plugin.Meta\`. Use this to discover what plugins exist before drilling into one.
      Returns lightweight rows; call get_plugin for the full breakdown of modules, surfaces, capabilities, and operations.
    `,
    inputSchema: ListPluginsInput,
  },
  get_plugin: {
    title: 'Get plugin detail',
    description: trim`
      Fetch the full record for a single plugin by its meta id (e.g. "org.dxos.plugin.markdown").
      Returns the plugin meta, the module helpers it composes, and the surfaces, capabilities, and operations
      it contributes. Use after list_plugins or when the user references a plugin by id.
    `,
    inputSchema: GetPluginInput,
  },
  list_surfaces: {
    title: 'List surfaces',
    description: trim`
      List Surface.create({ id, role, ... }) contributions across the monorepo. Use this to discover available
      surface ids when wiring a new container, or to check whether a surface name is already taken.
      Filter by \`pluginId\` to scope to a single plugin.
    `,
    inputSchema: ListSurfacesInput,
  },
  list_capabilities: {
    title: 'List capability contributions',
    description: trim`
      List Capability.contributes(<key>, ...) calls across the monorepo. Use this to discover which capability
      keys are produced (or required) by which plugins. Filter by \`pluginId\` to scope to a single plugin.
    `,
    inputSchema: ListCapabilitiesInput,
  },
  list_operations: {
    title: 'List operations',
    description: trim`
      List Operation.make({ meta: { key, name, description } }) calls across the monorepo. Operations are the
      unit of work dispatched through the OperationInvoker (formerly "intents"). Filter by \`pluginId\` to scope
      to a single plugin.
    `,
    inputSchema: ListOperationsInput,
  },
  list_schemas: {
    title: 'List schemas',
    description: trim`
      List ECHO-registered types — anything passing through \`Type.object({ typename, version })\` or
      \`Type.Obj(...)\` in the monorepo. Use this to discover what data types exist before reading their
      shape with get_schema. Filter by \`pluginId\` (e.g. "org.dxos.plugin.markdown") to scope to a single
      plugin's schemas, or by \`package\` for a single package.
    `,
    inputSchema: ListSchemasInput,
  },
  get_schema: {
    title: 'Get schema detail by typename',
    description: trim`
      Fetch the full record for one schema by its typename (e.g. "org.dxos.type.document").
      Returns the field list, version, owning package, and source location. Use after list_schemas or
      when the user references a typename directly.
    `,
    inputSchema: GetSchemaInput,
  },
  find_schema_usage: {
    title: 'Find references to a schema typename',
    description: trim`
      List every line in the monorepo that mentions a typename. Useful for understanding where a
      data type is consumed, referenced via \`Ref.Ref(...)\`, or wired into a plugin. Returns file + line +
      snippet. The defining \`Type.object\` line is excluded — see get_schema for that.
    `,
    inputSchema: FindSchemaUsageInput,
  },
};

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
 * to *invoke* tools should import `TOOL_METADATA` directly instead.
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
 * Materialize a `ToolDefinition`'s `inputSchema` (Effect Struct) into the
 * `Record<string, z.ZodTypeAny>` shape the MCP SDK's `registerTool` requires.
 * Called once per tool at server startup; throws with a clear message if a
 * tool's input uses a schema pattern the converter doesn't support.
 */
export const inputSchemaToZod = (struct: Schema.Struct<any>): Record<string, z.ZodTypeAny> => effectFieldsToZod(struct);
