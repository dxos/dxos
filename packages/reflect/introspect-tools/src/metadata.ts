//
// Copyright 2026 DXOS.org
//

// Static tool metadata + the Effect Schema → Zod adapter for the MCP SDK.
//
// Pure data + a stateless converter — no introspector, no Node-only deps,
// no MCP SDK. The introspect-mcp server consumes this map at startup to
// register each tool with a handler closing over its `Introspector`;
// browser-side consumers (react-ui-introspect, etc.) consume the same map
// to render forms / lists / docs from a single source of truth.

import * as Schema from 'effect/Schema';
import type { z } from 'zod';

import { effectFieldsToZod } from '@dxos/effect-zod';
import { trim } from '@dxos/util';

import {
  CapabilitySchema,
  IdiomSchema,
  OperationSchema,
  PackageSchema,
  PluginSchema,
  SchemaSchema,
  SurfaceSchema,
  SymbolDetailSchema,
  SymbolMatchSchema,
} from './output-schemas';
import {
  FindSymbolInput,
  GetPackageInput,
  GetSymbolInput,
  ListCapabilitiesInput,
  ListIdiomsInput,
  ListOperationsInput,
  ListPackagesInput,
  ListPluginsInput,
  ListSchemasInput,
  ListSurfacesInput,
  ListSymbolsInput,
} from './schemas';

/**
 * Pure metadata for a single MCP tool — what an MCP client needs to know
 * before invoking it: human-readable title, an LLM-targeted description,
 * and the Effect Schema input contract.
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
   * Effect Schema struct describing the tool's input. Server-side, the
   * MCP SDK requires zod, so the server converts to zod via
   * `inputSchemaToZod` at registration time. Browser consumers
   * (react-ui-form, etc.) use this directly.
   */
  inputSchema: Schema.Struct<any>;

  /**
   * Effect Schema struct describing the tool's success return shape.
   * MCP's `structuredContent` must be a JSON object, so each tool wraps
   * its item(s) under a stable top-level key (e.g. `{ packages: [...] }`,
   * `{ package: null | {...} }`). Consumers building Effect AI Tools can
   * pass this directly as `success` to `Tool.make`.
   */
  outputSchema: Schema.Struct<any>;
};

/**
 * Static metadata for every tool the introspect-mcp server exposes. No
 * introspector or runtime state — safe to import from a browser bundle.
 *
 * Adding a tool means: (1) define its input schema in `./schemas.ts`,
 * (2) add an entry here, (3) add a matching handler in
 * `@dxos/introspect-mcp` that closes over a runtime `Introspector`.
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
    outputSchema: Schema.Struct({ packages: Schema.Array(PackageSchema) }),
  },
  get_package: {
    title: 'Get package detail',
    description: trim`
      Fetch the full record for a single package by its name (e.g. "@dxos/echo").
      Returns workspace and external dependencies, entry points, and metadata.
      Use after list_packages or when the user references a package directly.
    `,
    inputSchema: GetPackageInput,
    outputSchema: Schema.Struct({ package: Schema.NullOr(PackageSchema) }),
  },
  list_symbols: {
    title: 'List all exported symbols of a package',
    description: trim`
      Enumerate every exported symbol declared by a single package (e.g. all exports of "@dxos/echo-react").
      Use this when the user wants to know what a specific package offers, or to browse a package after get_package.
      Returns lightweight rows with refs you can pass to get_symbol; capped at 30 — refine with \`kind\` or call get_symbol directly.
    `,
    inputSchema: ListSymbolsInput,
    outputSchema: Schema.Struct({ symbols: Schema.Array(SymbolMatchSchema) }),
  },
  find_symbol: {
    title: 'Find an exported symbol by name',
    description: trim`
      Find an exported symbol (function, class, type, hook, schema) by name or partial name across all DXOS packages.
      Use this when the user references something by name and you need to locate which package owns it before reading more.
      Returns refs you can pass to get_symbol. Ranking: exact match, then prefix, then substring.
    `,
    inputSchema: FindSymbolInput,
    outputSchema: Schema.Struct({ matches: Schema.Array(SymbolMatchSchema) }),
  },
  get_symbol: {
    title: 'Get symbol detail',
    description: trim`
      Fetch detail for a single symbol by ref (e.g. "@dxos/echo#Expando").
      Default response is signature + JSDoc summary + source location.
      Pass include=["source"] to expand the full declaration text, include=["jsdoc"] for the full JSDoc body.
    `,
    inputSchema: GetSymbolInput,
    outputSchema: Schema.Struct({ symbol: Schema.NullOr(SymbolDetailSchema) }),
  },
  list_plugins: {
    title: 'List Composer plugins',
    description: trim`
      List plugins detected in the monorepo. A plugin is a package whose src/meta.ts exports a \`Plugin.Meta\`.
      Use this to discover what plugins exist before drilling into surfaces / capabilities / operations / schemas.
      Filter by \`id\` substring (e.g. "markdown") to narrow the list.
    `,
    inputSchema: ListPluginsInput,
    outputSchema: Schema.Struct({ plugins: Schema.Array(PluginSchema) }),
  },
  list_surfaces: {
    title: 'List surfaces',
    description: trim`
      List Surface.create({ id, role, ... }) contributions across the monorepo. Use this to discover available
      surface ids when wiring a new container, or to check whether a surface name is already taken.
      Filter by \`id\` (plugin id) to scope to a single plugin's surfaces.
    `,
    inputSchema: ListSurfacesInput,
    outputSchema: Schema.Struct({ surfaces: Schema.Array(SurfaceSchema) }),
  },
  list_capabilities: {
    title: 'List capability contributions',
    description: trim`
      List Capability.provide(<key>, ...) calls across the monorepo. Use this to discover which capability
      keys are produced (or required) by which plugins. Filter by \`id\` (plugin id) to scope to a single plugin.
    `,
    inputSchema: ListCapabilitiesInput,
    outputSchema: Schema.Struct({ capabilities: Schema.Array(CapabilitySchema) }),
  },
  list_operations: {
    title: 'List operations',
    description: trim`
      List operations contributed by plugins. An *operation* is a serializable
      request (verb + payload) dispatched through the OperationInvoker —
      Composer's equivalent of an action / command. Most plugins contribute
      these via \`Capabilities.OperationHandler\`. Filter by \`id\` (plugin id)
      to scope to a single plugin.
    `,
    inputSchema: ListOperationsInput,
    outputSchema: Schema.Struct({ operations: Schema.Array(OperationSchema) }),
  },
  list_schemas: {
    title: 'List schemas',
    description: trim`
      List ECHO-registered types contributed by plugins (declared via addSchemaModule).
      Use this to discover what data types exist before reading their shape.
      Filter by \`id\` (plugin id, e.g. "org.dxos.plugin.markdown") to scope to a single plugin's schemas.
    `,
    inputSchema: ListSchemasInput,
    outputSchema: Schema.Struct({ schemas: Schema.Array(SchemaSchema) }),
  },
  list_idioms: {
    title: 'List idioms',
    description: trim`
      List idioms catalogued across the monorepo. An *idiom* is a JSDoc-tagged
      reference example (\`@idiom <slug>\`) that pins the canonical way to use a
      symbol — applicability, anti-pattern, and links to related idioms. Use this
      to discover how a feature is meant to be used, or to find a worked example
      before writing new code. Filter by \`slug\` substring or by \`hostKind\`
      (\`symbol\`, \`story\`, \`test\`).
    `,
    inputSchema: ListIdiomsInput,
    outputSchema: Schema.Struct({ idioms: Schema.Array(IdiomSchema) }),
  },
};

/**
 * Materialize a tool's `inputSchema` (Effect Struct) into the
 * `Record<string, z.ZodTypeAny>` shape the MCP SDK's `registerTool` requires.
 * Called once per tool at server startup; throws with a clear message if a
 * tool's input uses a schema pattern the converter doesn't support.
 */
export const inputSchemaToZod = (struct: Schema.Struct<any>): Record<string, z.ZodTypeAny> => effectFieldsToZod(struct);
