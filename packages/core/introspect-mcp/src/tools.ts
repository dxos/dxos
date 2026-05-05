//
// Copyright 2026 DXOS.org
//

// Tool definitions — the static metadata + the handler body for every MCP
// tool the introspect-mcp server exposes.
//
// Centralizing this map gives us:
//
//   - One place to read when wondering "what tools does this server expose?"
//   - A simple shape for `server.ts` to iterate when registering tools, so the
//     server's only job is wiring (transport, error handling, readiness gate).
//   - A natural surface to extend without touching server-construction logic
//     — adding a tool is a single new entry in this map.
//
// Each handler returns a `ToolResult` (data + optional note + optional
// truncated marker); the server wraps that in the MCP `content` envelope.
// Handlers DO NOT call `await introspector.ready` themselves — the server
// applies that gate uniformly via `withReady`, so a future tool can't
// accidentally skip it.

import { z } from 'zod';

import type { Introspector } from '@dxos/introspect';
import { trim } from '@dxos/util';

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

/** A single MCP tool — static metadata plus a body that produces a `ToolResult`. */
export type ToolDefinition<TArgs = Record<string, unknown>> = {
  /** Human-readable title surfaced by Inspector / Composer. */
  title: string;
  /**
   * LLM-targeted description. Models read this to decide WHEN to call the
   * tool — write it for trigger accuracy, not for human reading. State both
   * what the tool does and the situations it's the right answer for.
   */
  description: string;
  /** Zod input schema; describes go straight to the MCP client. */
  inputSchema: Record<string, z.ZodTypeAny>;
  /** Tool body. Must NOT await `introspector.ready` — the server gates that uniformly. */
  handler: (args: TArgs) => ToolResult | Promise<ToolResult>;
};

/**
 * Build the tool map for a given introspector. Returning a map (rather than a
 * static const) lets the handlers close over the introspector instance and
 * the per-process logger.
 */
export const createToolDefinitions = (
  introspector: Introspector,
  log: ToolLogger,
): Record<string, ToolDefinition<any>> => ({
  list_packages: {
    title: 'List monorepo packages',
    description: trim`
      List packages in the DXOS monorepo. Use this to discover what packages exist before drilling into one.
      Supports filtering by name substring, path prefix (e.g. "packages/plugins"), or workspace-private only.
      Returns lightweight rows; call get_package for dependency and entry-point detail.
    `,
    inputSchema: {
      name: z.string().optional().describe('Substring of the package name (case-insensitive).'),
      pathPrefix: z
        .string()
        .optional()
        .describe('Restrict to packages whose path starts with this segment, e.g. "packages/plugins".'),
      privateOnly: z.boolean().optional().describe('If true, only include workspace-private packages.'),
    },
    handler: (args: { name?: string; pathPrefix?: string; privateOnly?: boolean }) => {
      const result = introspector.listPackages({
        name: args.name,
        pathPrefix: args.pathPrefix,
        privateOnly: args.privateOnly,
      });
      const shaped = shapeListPackages(result);
      log({ tool: 'list_packages', args, count: result.length, truncated: shaped.truncated });
      return shaped;
    },
  } satisfies ToolDefinition<{ name?: string; pathPrefix?: string; privateOnly?: boolean }>,

  get_package: {
    title: 'Get package detail',
    description: trim`
      Fetch the full record for a single package by its name (e.g. "@dxos/echo").
      Returns workspace and external dependencies, entry points, and metadata.
      Use after list_packages or when the user references a package directly.
    `,
    inputSchema: {
      name: z.string().describe('Exact package name, e.g. "@dxos/echo".'),
    },
    handler: (args: { name: string }) => {
      const detail = introspector.getPackage(args.name);
      log({ tool: 'get_package', args, found: detail !== null });
      if (!detail) {
        return { data: null, note: `No package named ${args.name}` };
      }
      return shapeGetPackage(detail);
    },
  } satisfies ToolDefinition<{ name: string }>,

  list_symbols: {
    title: 'List all exported symbols of a package',
    description: trim`
      Enumerate every exported symbol declared by a single package (e.g. all exports of "@dxos/echo-react").
      Use this when the user wants to know what a specific package offers, or to browse a package after get_package.
      Returns lightweight rows with refs you can pass to get_symbol; capped at 30 — refine with \`kind\` or call get_symbol directly.
    `,
    inputSchema: {
      package: z.string().describe('Exact package name, e.g. "@dxos/ai".'),
      kind: z
        .enum(['function', 'class', 'interface', 'type', 'enum', 'variable', 'namespace'])
        .optional()
        .describe('Optional filter on declaration kind.'),
    },
    handler: (args: { package: string; kind?: SymbolKind }) => {
      const matches = introspector.listSymbols(args.package, args.kind);
      const shaped = shapeFindSymbol(matches);
      log({ tool: 'list_symbols', args, count: matches.length, truncated: shaped.truncated });
      return shaped;
    },
  } satisfies ToolDefinition<{ package: string; kind?: SymbolKind }>,

  find_symbol: {
    title: 'Find an exported symbol by name',
    description: trim`
      Find an exported symbol (function, class, type, hook, schema) by name or partial name across all DXOS packages.
      Use this when the user references something by name and you need to locate which package owns it before reading more.
      Returns refs you can pass to get_symbol. Ranking: exact match, then prefix, then substring.
    `,
    inputSchema: {
      query: z.string().describe('Symbol name or partial name (case-insensitive).'),
      kind: z
        .enum(['function', 'class', 'interface', 'type', 'enum', 'variable', 'namespace'])
        .optional()
        .describe('Optional filter on declaration kind.'),
    },
    handler: (args: { query: string; kind?: SymbolKind }) => {
      const matches = introspector.findSymbol(args.query, args.kind);
      const shaped = shapeFindSymbol(matches);
      log({ tool: 'find_symbol', args, count: matches.length, truncated: shaped.truncated });
      return shaped;
    },
  } satisfies ToolDefinition<{ query: string; kind?: SymbolKind }>,

  get_symbol: {
    title: 'Get symbol detail',
    description: trim`
      Fetch detail for a single symbol by ref (e.g. "@dxos/echo#Expando").
      Default response is signature + JSDoc summary + source location.
      Pass include=["source"] to expand the full declaration text, include=["jsdoc"] for the full JSDoc body.
    `,
    inputSchema: {
      ref: z.string().describe('Symbol ref in the form "<package>#<name>", e.g. "@dxos/echo#Expando".'),
      include: z
        .array(z.enum(['source', 'jsdoc']))
        .optional()
        .describe('Optional fields to expand; default returns signature + summary only.'),
    },
    handler: (args: { ref: string; include?: Array<'source' | 'jsdoc'> }) => {
      const detail = introspector.getSymbol(args.ref, args.include);
      log({ tool: 'get_symbol', args, found: detail !== null });
      if (!detail) {
        return { data: null, note: `No symbol with ref ${args.ref}` };
      }
      return shapeGetSymbol(detail);
    },
  } satisfies ToolDefinition<{ ref: string; include?: Array<'source' | 'jsdoc'> }>,

  list_plugins: {
    title: 'List Composer plugins',
    description: trim`
      List plugins detected in the monorepo. A plugin is a package whose src/ contains a \`Plugin.define(meta)\` call
      and a meta.ts exporting \`Plugin.Meta\`. Use this to discover what plugins exist before drilling into one.
      Returns lightweight rows; call get_plugin for the full breakdown of modules, surfaces, capabilities, and operations.
    `,
    inputSchema: {
      query: z
        .string()
        .optional()
        .describe('Substring of the plugin id, name, or owning package name (case-insensitive).'),
      pathPrefix: z
        .string()
        .optional()
        .describe('Restrict to plugins whose owning package starts with this path, e.g. "packages/plugins".'),
    },
    handler: (args: { query?: string; pathPrefix?: string }) => {
      const result = introspector.listPlugins({ query: args.query, pathPrefix: args.pathPrefix });
      const shaped = shapeListPlugins(result);
      log({ tool: 'list_plugins', args, count: result.length, truncated: shaped.truncated });
      return shaped;
    },
  } satisfies ToolDefinition<{ query?: string; pathPrefix?: string }>,

  get_plugin: {
    title: 'Get plugin detail',
    description: trim`
      Fetch the full record for a single plugin by its meta id (e.g. "org.dxos.plugin.markdown").
      Returns the plugin meta, the module helpers it composes, and the surfaces, capabilities, and operations
      it contributes. Use after list_plugins or when the user references a plugin by id.
    `,
    inputSchema: {
      id: z.string().describe('Plugin id from meta.ts, e.g. "org.dxos.plugin.markdown".'),
    },
    handler: (args: { id: string }) => {
      const detail = introspector.getPlugin(args.id);
      log({ tool: 'get_plugin', args, found: detail !== null });
      if (!detail) {
        return { data: null, note: `No plugin with id ${args.id}` };
      }
      return shapeGetPlugin(detail);
    },
  } satisfies ToolDefinition<{ id: string }>,

  list_surfaces: {
    title: 'List surfaces',
    description: trim`
      List Surface.create({ id, role, ... }) contributions across the monorepo. Use this to discover available
      surface ids when wiring a new container, or to check whether a surface name is already taken.
      Filter by \`pluginId\` to scope to a single plugin.
    `,
    inputSchema: {
      pluginId: z.string().optional().describe('Restrict to surfaces contributed by this plugin id.'),
    },
    handler: (args: { pluginId?: string }) => {
      const result = introspector.listSurfaces(args.pluginId);
      const shaped = shapeListSurfaces(result);
      log({ tool: 'list_surfaces', args, count: result.length, truncated: shaped.truncated });
      return shaped;
    },
  } satisfies ToolDefinition<{ pluginId?: string }>,

  list_capabilities: {
    title: 'List capability contributions',
    description: trim`
      List Capability.contributes(<key>, ...) calls across the monorepo. Use this to discover which capability
      keys are produced (or required) by which plugins. Filter by \`pluginId\` to scope to a single plugin.
    `,
    inputSchema: {
      pluginId: z.string().optional().describe('Restrict to capabilities contributed by this plugin id.'),
    },
    handler: (args: { pluginId?: string }) => {
      const result = introspector.listCapabilities(args.pluginId);
      const shaped = shapeListCapabilities(result);
      log({ tool: 'list_capabilities', args, count: result.length, truncated: shaped.truncated });
      return shaped;
    },
  } satisfies ToolDefinition<{ pluginId?: string }>,

  list_operations: {
    title: 'List operations',
    description: trim`
      List Operation.make({ meta: { key, name, description } }) calls across the monorepo. Operations are the
      unit of work dispatched through the OperationInvoker (formerly "intents"). Filter by \`pluginId\` to scope
      to a single plugin.
    `,
    inputSchema: {
      pluginId: z.string().optional().describe('Restrict to operations defined within this plugin id.'),
    },
    handler: (args: { pluginId?: string }) => {
      const result = introspector.listOperations(args.pluginId);
      const shaped = shapeListOperations(result);
      log({ tool: 'list_operations', args, count: result.length, truncated: shaped.truncated });
      return shaped;
    },
  } satisfies ToolDefinition<{ pluginId?: string }>,

  list_schemas: {
    title: 'List schemas',
    description: trim`
      List ECHO-registered types — anything passing through \`Type.object({ typename, version })\` or
      \`Type.Obj(...)\` in the monorepo. Use this to discover what data types exist before reading their
      shape with get_schema. Filter by \`pluginId\` (e.g. "org.dxos.plugin.markdown") to scope to a single
      plugin's schemas, or by \`package\` for a single package.
    `,
    inputSchema: {
      pluginId: z
        .string()
        .optional()
        .describe(
          'Restrict to schemas defined in a package that declares this plugin id, e.g. "org.dxos.plugin.markdown".',
        ),
      package: z.string().optional().describe('Restrict to schemas defined within this exact package name.'),
    },
    handler: (args: { pluginId?: string; package?: string }) => {
      const result = introspector.listSchemas({ package: args.package, pluginId: args.pluginId });
      const shaped = shapeListSchemas(result);
      log({ tool: 'list_schemas', args, count: result.length, truncated: shaped.truncated });
      return shaped;
    },
  } satisfies ToolDefinition<{ pluginId?: string; package?: string }>,

  get_schema: {
    title: 'Get schema detail by typename',
    description: trim`
      Fetch the full record for one schema by its typename (e.g. "org.dxos.type.document").
      Returns the field list, version, owning package, and source location. Use after list_schemas or
      when the user references a typename directly.
    `,
    inputSchema: {
      typename: z.string().describe('Schema typename, e.g. "org.dxos.type.document".'),
    },
    handler: (args: { typename: string }) => {
      const detail = introspector.getSchema(args.typename);
      log({ tool: 'get_schema', args, found: detail !== null });
      if (!detail) {
        return { data: null, note: `No schema with typename ${args.typename}` };
      }
      return shapeGetSchema(detail);
    },
  } satisfies ToolDefinition<{ typename: string }>,

  find_schema_usage: {
    title: 'Find references to a schema typename',
    description: trim`
      List every line in the monorepo that mentions a typename. Useful for understanding where a
      data type is consumed, referenced via \`Ref.Ref(...)\`, or wired into a plugin. Returns file + line +
      snippet. The defining \`Type.object\` line is excluded — see get_schema for that.
    `,
    inputSchema: {
      typename: z.string().describe('Schema typename, e.g. "org.dxos.type.document".'),
    },
    handler: (args: { typename: string }) => {
      const usages = introspector.findSchemaUsage(args.typename);
      const shaped = shapeFindSchemaUsage(usages);
      log({ tool: 'find_schema_usage', args, count: usages.length, truncated: shaped.truncated });
      return shaped;
    },
  } satisfies ToolDefinition<{ typename: string }>,
});

// Re-exported here so callers don't have to import from `@dxos/introspect`
// just to type a `kind` arg.
type SymbolKind = 'function' | 'class' | 'interface' | 'type' | 'enum' | 'variable' | 'namespace';
