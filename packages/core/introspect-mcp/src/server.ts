//
// Copyright 2026 DXOS.org
//

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { Introspector } from '@dxos/introspect';

import { registerLogger, type ToolLogger } from './logger';
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

export type ServerOptions = {
  introspector: Introspector;
  /** Server name advertised over MCP. */
  name?: string;
  /** Server version advertised over MCP. */
  version?: string;
  /** Optional logger; defaults to a no-op. */
  logger?: ToolLogger;
};

export const createServer = (options: ServerOptions): McpServer => {
  const { introspector } = options;
  const log = registerLogger(options.logger);

  // Every tool handler starts with `await introspector.ready` so it blocks on
  // indexing — but only when the handler runs. `initialize` and `tools/list`
  // are answered by the SDK from the static tool registry below, so MCP
  // clients (Inspector, Claude Code, Composer) connect immediately even on a
  // cold cache. Cold-start cost is paid once, on the first `tools/call`.
  const server = new McpServer({
    name: options.name ?? '@dxos/introspect-mcp',
    version: options.version ?? '0.0.0',
  });

  /**
   * list_packages
   */
  server.registerTool(
    'list_packages',
    {
      title: 'List monorepo packages',
      description:
        'List packages in the DXOS monorepo. Use this to discover what packages exist before drilling into one. ' +
        'Supports filtering by name substring, path prefix (e.g. "packages/plugins"), or workspace-private only. ' +
        'Returns lightweight rows; call get_package for dependency and entry-point detail.',
      inputSchema: {
        name: z.string().optional().describe('Substring of the package name (case-insensitive).'),
        pathPrefix: z
          .string()
          .optional()
          .describe('Restrict to packages whose path starts with this segment, e.g. "packages/plugins".'),
        privateOnly: z.boolean().optional().describe('If true, only include workspace-private packages.'),
      },
    },
    async (args) => {
      await introspector.ready;
      const result = introspector.listPackages({
        name: args.name,
        pathPrefix: args.pathPrefix,
        privateOnly: args.privateOnly,
      });
      const shaped = shapeListPackages(result);
      log({ tool: 'list_packages', args, count: result.length, truncated: shaped.truncated });
      return toToolResult(shaped);
    },
  );

  /**
   * get_package
   */
  server.registerTool(
    'get_package',
    {
      title: 'Get package detail',
      description:
        'Fetch the full record for a single package by its name (e.g. "@dxos/echo"). ' +
        'Returns workspace and external dependencies, entry points, and metadata. ' +
        'Use after list_packages or when the user references a package directly.',
      inputSchema: {
        name: z.string().describe('Exact package name, e.g. "@dxos/echo".'),
      },
    },
    async (args) => {
      await introspector.ready;
      const detail = introspector.getPackage(args.name);
      log({ tool: 'get_package', args, found: detail !== null });
      if (!detail) {
        return toToolResult({ data: null, note: `No package named ${args.name}` });
      }
      return toToolResult(shapeGetPackage(detail));
    },
  );

  /**
   * list_symbols
   */
  server.registerTool(
    'list_symbols',
    {
      title: 'List all exported symbols of a package',
      description:
        'Enumerate every exported symbol declared by a single package (e.g. all exports of "@dxos/echo-react"). ' +
        'Use this when the user wants to know what a specific package offers, or to browse a package after get_package. ' +
        'Returns lightweight rows with refs you can pass to get_symbol; capped at 30 — refine with `kind` or call get_symbol directly.',
      inputSchema: {
        package: z.string().describe('Exact package name, e.g. "@dxos/ai".'),
        kind: z
          .enum(['function', 'class', 'interface', 'type', 'enum', 'variable', 'namespace'])
          .optional()
          .describe('Optional filter on declaration kind.'),
      },
    },
    async (args) => {
      await introspector.ready;
      const matches = introspector.listSymbols(args.package, args.kind);
      const shaped = shapeFindSymbol(matches);
      log({ tool: 'list_symbols', args, count: matches.length, truncated: shaped.truncated });
      return toToolResult(shaped);
    },
  );

  /**
   * find_symbol
   */
  server.registerTool(
    'find_symbol',
    {
      title: 'Find an exported symbol by name',
      description:
        'Find an exported symbol (function, class, type, hook, schema) by name or partial name across all DXOS packages. ' +
        'Use this when the user references something by name and you need to locate which package owns it before reading more. ' +
        'Returns refs you can pass to get_symbol. Ranking: exact match, then prefix, then substring.',
      inputSchema: {
        query: z.string().describe('Symbol name or partial name (case-insensitive).'),
        kind: z
          .enum(['function', 'class', 'interface', 'type', 'enum', 'variable', 'namespace'])
          .optional()
          .describe('Optional filter on declaration kind.'),
      },
    },
    async (args) => {
      await introspector.ready;
      const matches = introspector.findSymbol(args.query, args.kind);
      const shaped = shapeFindSymbol(matches);
      log({ tool: 'find_symbol', args, count: matches.length, truncated: shaped.truncated });
      return toToolResult(shaped);
    },
  );

  /**
   * get_symbol
   */
  server.registerTool(
    'get_symbol',
    {
      title: 'Get symbol detail',
      description:
        'Fetch detail for a single symbol by ref (e.g. "@dxos/echo#Expando"). ' +
        'Default response is signature + JSDoc summary + source location. ' +
        'Pass include=["source"] to expand the full declaration text, include=["jsdoc"] for the full JSDoc body.',
      inputSchema: {
        ref: z.string().describe('Symbol ref in the form "<package>#<name>", e.g. "@dxos/echo#Expando".'),
        include: z
          .array(z.enum(['source', 'jsdoc']))
          .optional()
          .describe('Optional fields to expand; default returns signature + summary only.'),
      },
    },
    async (args) => {
      await introspector.ready;
      const detail = introspector.getSymbol(args.ref, args.include);
      log({ tool: 'get_symbol', args, found: detail !== null });
      if (!detail) {
        return toToolResult({ data: null, note: `No symbol with ref ${args.ref}` });
      }
      return toToolResult(shapeGetSymbol(detail));
    },
  );

  /**
   * list_plugins
   */
  server.registerTool(
    'list_plugins',
    {
      title: 'List Composer plugins',
      description:
        'List plugins detected in the monorepo. A plugin is a package whose src/ contains a `Plugin.define(meta)` call ' +
        'and a meta.ts exporting `Plugin.Meta`. Use this to discover what plugins exist before drilling into one. ' +
        'Returns lightweight rows; call get_plugin for the full breakdown of modules, surfaces, capabilities, and operations.',
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
    },
    async (args) => {
      await introspector.ready;
      const result = introspector.listPlugins({ query: args.query, pathPrefix: args.pathPrefix });
      const shaped = shapeListPlugins(result);
      log({ tool: 'list_plugins', args, count: result.length, truncated: shaped.truncated });
      return toToolResult(shaped);
    },
  );

  /**
   * get_plugin
   */
  server.registerTool(
    'get_plugin',
    {
      title: 'Get plugin detail',
      description:
        'Fetch the full record for a single plugin by its meta id (e.g. "org.dxos.plugin.markdown"). ' +
        'Returns the plugin meta, the module helpers it composes, and the surfaces, capabilities, and operations ' +
        'it contributes. Use after list_plugins or when the user references a plugin by id.',
      inputSchema: {
        id: z.string().describe('Plugin id from meta.ts, e.g. "org.dxos.plugin.markdown".'),
      },
    },
    async (args) => {
      await introspector.ready;
      const detail = introspector.getPlugin(args.id);
      log({ tool: 'get_plugin', args, found: detail !== null });
      if (!detail) {
        return toToolResult({ data: null, note: `No plugin with id ${args.id}` });
      }
      return toToolResult(shapeGetPlugin(detail));
    },
  );

  /**
   * list_surfaces
   */
  server.registerTool(
    'list_surfaces',
    {
      title: 'List surfaces',
      description:
        'List Surface.create({ id, role, ... }) contributions across the monorepo. Use this to discover available ' +
        'surface ids when wiring a new container, or to check whether a surface name is already taken. ' +
        'Filter by `pluginId` to scope to a single plugin.',
      inputSchema: {
        pluginId: z.string().optional().describe('Restrict to surfaces contributed by this plugin id.'),
      },
    },
    async (args) => {
      await introspector.ready;
      const result = introspector.listSurfaces(args.pluginId);
      const shaped = shapeListSurfaces(result);
      log({ tool: 'list_surfaces', args, count: result.length, truncated: shaped.truncated });
      return toToolResult(shaped);
    },
  );

  /**
   * list_capabilities
   */
  server.registerTool(
    'list_capabilities',
    {
      title: 'List capability contributions',
      description:
        'List Capability.contributes(<key>, ...) calls across the monorepo. Use this to discover which capability ' +
        'keys are produced (or required) by which plugins. Filter by `pluginId` to scope to a single plugin.',
      inputSchema: {
        pluginId: z.string().optional().describe('Restrict to capabilities contributed by this plugin id.'),
      },
    },
    async (args) => {
      await introspector.ready;
      const result = introspector.listCapabilities(args.pluginId);
      const shaped = shapeListCapabilities(result);
      log({ tool: 'list_capabilities', args, count: result.length, truncated: shaped.truncated });
      return toToolResult(shaped);
    },
  );

  /**
   * list_operations
   */
  server.registerTool(
    'list_operations',
    {
      title: 'List operations',
      description:
        'List Operation.make({ meta: { key, name, description } }) calls across the monorepo. Operations are the ' +
        'unit of work dispatched through the OperationInvoker (formerly "intents"). Filter by `pluginId` to scope ' +
        'to a single plugin.',
      inputSchema: {
        pluginId: z.string().optional().describe('Restrict to operations defined within this plugin id.'),
      },
    },
    async (args) => {
      await introspector.ready;
      const result = introspector.listOperations(args.pluginId);
      const shaped = shapeListOperations(result);
      log({ tool: 'list_operations', args, count: result.length, truncated: shaped.truncated });
      return toToolResult(shaped);
    },
  );

  /**
   * list_schemas
   */
  server.registerTool(
    'list_schemas',
    {
      title: 'List ECHO-registered schemas',
      description:
        'List ECHO-registered types — anything passing through `Type.object({ typename, version })` or ' +
        '`Type.Obj(...)` in the monorepo. Use this to discover what data types exist before reading their ' +
        'shape with get_schema. Filter by `package` to scope to a single package.',
      inputSchema: {
        package: z.string().optional().describe('Restrict to schemas defined within this exact package name.'),
      },
    },
    async (args) => {
      await introspector.ready;
      const result = introspector.listSchemas(args.package);
      const shaped = shapeListSchemas(result);
      log({ tool: 'list_schemas', args, count: result.length, truncated: shaped.truncated });
      return toToolResult(shaped);
    },
  );

  /**
   * get_schema
   */
  server.registerTool(
    'get_schema',
    {
      title: 'Get schema detail by typename',
      description:
        'Fetch the full record for one schema by its typename (e.g. "org.dxos.type.document"). ' +
        'Returns the field list, version, owning package, and source location. Use after list_schemas or ' +
        'when the user references a typename directly.',
      inputSchema: {
        typename: z.string().describe('Schema typename, e.g. "org.dxos.type.document".'),
      },
    },
    async (args) => {
      await introspector.ready;
      const detail = introspector.getSchema(args.typename);
      log({ tool: 'get_schema', args, found: detail !== null });
      if (!detail) {
        return toToolResult({ data: null, note: `No schema with typename ${args.typename}` });
      }
      return toToolResult(shapeGetSchema(detail));
    },
  );

  /**
   * find_schema_usage
   */
  server.registerTool(
    'find_schema_usage',
    {
      title: 'Find references to a schema typename',
      description:
        'List every line in the monorepo that mentions a typename. Useful for understanding where a ' +
        'data type is consumed, referenced via `Ref.Ref(...)`, or wired into a plugin. Returns file + line + ' +
        'snippet. The defining `Type.object` line is excluded — see get_schema for that.',
      inputSchema: {
        typename: z.string().describe('Schema typename, e.g. "org.dxos.type.document".'),
      },
    },
    async (args) => {
      await introspector.ready;
      const usages = introspector.findSchemaUsage(args.typename);
      const shaped = shapeFindSchemaUsage(usages);
      log({ tool: 'find_schema_usage', args, count: usages.length, truncated: shaped.truncated });
      return toToolResult(shaped);
    },
  );

  return server;
};

const toToolResult = (shaped: ToolResult): { content: Array<{ type: 'text'; text: string }> } => {
  const payload: Record<string, unknown> = { data: shaped.data };
  if (shaped.note) {
    payload.note = shaped.note;
  }
  if (shaped.truncated) {
    payload.truncated = shaped.truncated;
  }
  return {
    content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
  };
};
