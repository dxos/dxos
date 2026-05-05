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
// Input schemas are authored in Effect Schema (see `./schemas.ts`) so that
// downstream consumers like `react-ui-form` can render forms from the same
// definitions. The MCP SDK requires zod, so we convert at registration time
// via `effectFieldsToZod`.
//
// Each handler returns a `ToolResult` (data + optional note + optional
// truncated marker); the server wraps that in the MCP `content` envelope.
// Handlers DO NOT call `await introspector.ready` themselves — the server
// applies that gate uniformly via `withReady`, so a future tool can't
// accidentally skip it.

import * as Schema from 'effect/Schema';
import type { z } from 'zod';

import { effectFieldsToZod } from '@dxos/effect-zod';
import type { Introspector } from '@dxos/introspect';
import { trim } from '@dxos/util';

import type { ToolLogger } from './logger';
import {
  type FindSymbolArgs,
  FindSymbolInput,
  type GetPackageArgs,
  GetPackageInput,
  type GetSymbolArgs,
  GetSymbolInput,
  type ListCapabilitiesArgs,
  ListCapabilitiesInput,
  type ListIntentsArgs,
  ListIntentsInput,
  type ListPackagesArgs,
  ListPackagesInput,
  type ListPluginsArgs,
  ListPluginsInput,
  type ListSchemasArgs,
  ListSchemasInput,
  type ListSurfacesArgs,
  ListSurfacesInput,
  type ListSymbolsArgs,
  ListSymbolsInput,
} from './schemas';
import {
  type ListOptions,
  shapeFindSymbol,
  shapeGetPackage,
  shapeGetSymbol,
  shapeListCapabilities,
  shapeListIntents,
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
    inputSchema: ListPackagesInput,
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
    title: 'Get package detail',
    description: trim`
      Fetch the full record for a single package by its name (e.g. "@dxos/echo").
      Returns workspace and external dependencies, entry points, and metadata.
      Use after list_packages or when the user references a package directly.
    `,
    inputSchema: GetPackageInput,
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
    title: 'List all exported symbols of a package',
    description: trim`
      Enumerate every exported symbol declared by a single package (e.g. all exports of "@dxos/echo-react").
      Use this when the user wants to know what a specific package offers, or to browse a package after get_package.
      Returns lightweight rows with refs you can pass to get_symbol; capped at 30 — refine with \`kind\` or call get_symbol directly.
    `,
    inputSchema: ListSymbolsInput,
    handler: (args: ListSymbolsArgs) => {
      const matches = introspector.listSymbols(args.package, args.kind);
      const shaped = shapeFindSymbol(matches, pickListOptions(args));
      log({ tool: 'list_symbols', args, count: matches.length, truncated: shaped.truncated });
      return shaped;
    },
  } satisfies ToolDefinition<ListSymbolsArgs>,

  find_symbol: {
    title: 'Find an exported symbol by name',
    description: trim`
      Find an exported symbol (function, class, type, hook, schema) by name or partial name across all DXOS packages.
      Use this when the user references something by name and you need to locate which package owns it before reading more.
      Returns refs you can pass to get_symbol. Ranking: exact match, then prefix, then substring.
    `,
    inputSchema: FindSymbolInput,
    handler: (args: FindSymbolArgs) => {
      const matches = introspector.findSymbol(args.query, args.kind);
      const shaped = shapeFindSymbol(matches, pickListOptions(args));
      log({ tool: 'find_symbol', args, count: matches.length, truncated: shaped.truncated });
      return shaped;
    },
  } satisfies ToolDefinition<FindSymbolArgs>,

  get_symbol: {
    title: 'Get symbol detail',
    description: trim`
      Fetch detail for a single symbol by ref (e.g. "@dxos/echo#Expando").
      Default response is signature + JSDoc summary + source location.
      Pass include=["source"] to expand the full declaration text, include=["jsdoc"] for the full JSDoc body.
    `,
    inputSchema: GetSymbolInput,
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
    title: 'List Composer plugins',
    description: trim`
      List plugins detected in the monorepo. A plugin is a package whose src/meta.ts exports a \`Plugin.Meta\`.
      Use this to discover what plugins exist before drilling into surfaces / capabilities / intents / schemas.
      Filter by \`id\` substring (e.g. "markdown") to narrow the list.
    `,
    inputSchema: ListPluginsInput,
    handler: (args: ListPluginsArgs) => {
      const result = introspector.listPlugins(args.id !== undefined ? { id: args.id } : undefined);
      const shaped = shapeListPlugins(result, pickListOptions(args));
      log({ tool: 'list_plugins', args, count: result.length, truncated: shaped.truncated });
      return shaped;
    },
  } satisfies ToolDefinition<ListPluginsArgs>,

  list_surfaces: {
    title: 'List surfaces',
    description: trim`
      List Surface.create({ id, role, ... }) contributions across the monorepo. Use this to discover available
      surface ids when wiring a new container, or to check whether a surface name is already taken.
      Filter by \`id\` (plugin id) to scope to a single plugin's surfaces.
    `,
    inputSchema: ListSurfacesInput,
    handler: (args: ListSurfacesArgs) => {
      const result = introspector.listSurfaces(args.id);
      const shaped = shapeListSurfaces(result, pickListOptions(args));
      log({ tool: 'list_surfaces', args, count: result.length, truncated: shaped.truncated });
      return shaped;
    },
  } satisfies ToolDefinition<ListSurfacesArgs>,

  list_capabilities: {
    title: 'List capability contributions',
    description: trim`
      List Capability.contributes(<key>, ...) calls across the monorepo. Use this to discover which capability
      keys are produced (or required) by which plugins. Filter by \`id\` (plugin id) to scope to a single plugin.
    `,
    inputSchema: ListCapabilitiesInput,
    handler: (args: ListCapabilitiesArgs) => {
      const result = introspector.listCapabilities(args.id);
      const shaped = shapeListCapabilities(result, pickListOptions(args));
      log({ tool: 'list_capabilities', args, count: result.length, truncated: shaped.truncated });
      return shaped;
    },
  } satisfies ToolDefinition<ListCapabilitiesArgs>,

  list_intents: {
    title: 'List intents',
    description: trim`
      List intents contributed by plugins (the unit of work dispatched through the IntentResolver).
      Filter by \`id\` (plugin id) to scope to a single plugin.
    `,
    inputSchema: ListIntentsInput,
    handler: (args: ListIntentsArgs) => {
      const result = introspector.listIntents(args.id);
      const shaped = shapeListIntents(result, pickListOptions(args));
      log({ tool: 'list_intents', args, count: result.length, truncated: shaped.truncated });
      return shaped;
    },
  } satisfies ToolDefinition<ListIntentsArgs>,

  list_schemas: {
    title: 'List schemas',
    description: trim`
      List ECHO-registered types contributed by plugins (declared via addSchemaModule).
      Use this to discover what data types exist before reading their shape.
      Filter by \`id\` (plugin id, e.g. "org.dxos.plugin.markdown") to scope to a single plugin's schemas.
    `,
    inputSchema: ListSchemasInput,
    handler: (args: ListSchemasArgs) => {
      const result = introspector.listSchemas(args.id);
      const shaped = shapeListSchemas(result, pickListOptions(args));
      log({ tool: 'list_schemas', args, count: result.length, truncated: shaped.truncated });
      return shaped;
    },
  } satisfies ToolDefinition<ListSchemasArgs>,
});

/**
 * Materialize a `ToolDefinition`'s `inputSchema` (Effect Struct) into the
 * `Record<string, z.ZodTypeAny>` shape the MCP SDK's `registerTool` requires.
 * Called once per tool at server startup; throws with a clear message if a
 * tool's input uses a schema pattern the converter doesn't support.
 */
export const inputSchemaToZod = (struct: Schema.Struct<any>): Record<string, z.ZodTypeAny> => effectFieldsToZod(struct);
