//
// Copyright 2026 DXOS.org
//

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { Introspector } from '@dxos/introspect';

import { registerLogger, type ToolLogger } from './logger';
import { shapeFindSymbol, shapeGetPackage, shapeGetSymbol, shapeListPackages, type ToolResult } from './shaping';

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
        package: z.string().describe('Exact package name, e.g. "@dxos/echo-react".'),
        kind: z
          .enum(['function', 'class', 'interface', 'type', 'enum', 'variable', 'namespace'])
          .optional()
          .describe('Optional filter on declaration kind.'),
      },
    },
    async (args) => {
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
      const detail = introspector.getSymbol(args.ref, args.include);
      log({ tool: 'get_symbol', args, found: detail !== null });
      if (!detail) {
        return toToolResult({ data: null, note: `No symbol with ref ${args.ref}` });
      }
      return toToolResult(shapeGetSymbol(detail));
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
