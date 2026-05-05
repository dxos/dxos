//
// Copyright 2026 DXOS.org
//

// Response shaping for token budgets.
//
// Tool responses target a sane default size for the LLM context (~30 list
// items, single-record fetches kept compact via `include` opt-ins). Callers
// that legitimately need a longer list pass `limit`; callers in "discovery
// mode" (just want to see what exists) pass `compact: true` for a refs/ids-
// only projection at roughly 1/4 the wire size.

import type {
  Capability,
  Operation,
  Package,
  PackageDetail,
  Plugin,
  PluginDetail,
  SchemaDetail,
  SchemaSummary,
  SchemaUsage,
  Surface,
  SymbolDetail,
  SymbolMatch,
} from '@dxos/introspect';

/** Default number of items returned by list-style tools when no `limit` is passed. */
export const DEFAULT_LIST_LIMIT = 30;
/**
 * Hard ceiling on `limit`. A runaway tool call shouldn't be able to dump every
 * symbol in the monorepo (~thousands) into the model's context. Callers who
 * truly need everything should iterate via filters (pluginId, package, etc.).
 */
export const MAX_LIST_LIMIT = 200;
const SOURCE_PREVIEW = 1200;
const JSDOC_PREVIEW = 600;

export type ToolResult = {
  data: unknown;
  note?: string;
  truncated?: string;
};

/**
 * Per-call options every list-style shaper accepts. Both fields are optional
 * — the defaults match the pre-existing behavior (limit=30, full projection).
 */
export type ListOptions = {
  /** Override the default `DEFAULT_LIST_LIMIT`. Capped at `MAX_LIST_LIMIT`. */
  limit?: number;
  /**
   * Return only the most-essential identifying fields (ref/id/name) instead
   * of the full record. Use when discovering what exists before drilling in
   * with a `get_*` call. Roughly 1/4 the token cost.
   */
  compact?: boolean;
};

type ShapeListConfig<T> = {
  /** Full projection — what an LLM gets when `compact` is false/omitted. */
  full: (item: T) => Record<string, unknown>;
  /** Compact projection — refs/ids/names only. */
  compact: (item: T) => Record<string, unknown>;
  /** Suffix for the `truncated` note: "<N> more results — <hint>". */
  truncationHint: string;
};

const shapeList = <T>(all: readonly T[], opts: ListOptions, config: ShapeListConfig<T>): ToolResult => {
  const requested = opts.limit ?? DEFAULT_LIST_LIMIT;
  const limit = Math.min(Math.max(0, Math.floor(requested)), MAX_LIST_LIMIT);
  const project = opts.compact ? config.compact : config.full;
  const data = all.slice(0, limit).map(project);
  if (all.length > limit) {
    return {
      data,
      truncated: `${all.length - limit} more results — ${config.truncationHint}`,
    };
  }
  return { data };
};

//
// Packages
//

export const shapeListPackages = (all: Package[], opts: ListOptions = {}): ToolResult =>
  shapeList(all, opts, {
    full: (p) => ({
      name: p.name,
      version: p.version,
      private: p.private,
      path: p.path,
      description: p.description,
    }),
    compact: (p) => ({ name: p.name, path: p.path }),
    truncationHint: 'raise `limit` (max 200), refine with `name`/`pathPrefix`, or call get_package directly.',
  });

export const shapeGetPackage = (detail: PackageDetail): ToolResult => ({
  data: {
    name: detail.name,
    version: detail.version,
    private: detail.private,
    path: detail.path,
    description: detail.description,
    workspaceDependencies: detail.workspaceDependencies,
    externalDependencies: detail.externalDependencies,
    entryPoints: detail.entryPoints,
    // Surfaced so callers can decide whether to call find_symbol against this package.
    exportCount: detail.exportCount,
  },
});

//
// Symbols
//

export const shapeFindSymbol = (matches: SymbolMatch[], opts: ListOptions = {}): ToolResult =>
  shapeList(matches, opts, {
    full: (m) => ({ ref: m.ref, name: m.name, package: m.package, kind: m.kind, summary: m.summary }),
    compact: (m) => ({ ref: m.ref, name: m.name }),
    truncationHint: 'raise `limit` (max 200), refine the query, or filter by `kind`.',
  });

export const shapeGetSymbol = (detail: SymbolDetail): ToolResult => {
  const result: Record<string, unknown> = {
    ref: detail.ref,
    package: detail.package,
    name: detail.name,
    kind: detail.kind,
    signature: detail.signature,
    summary: detail.summary,
    location: detail.location,
  };
  if (detail.jsdoc) {
    result.jsdoc = truncate(detail.jsdoc, JSDOC_PREVIEW);
  }
  if (detail.source !== undefined) {
    result.source = truncate(detail.source, SOURCE_PREVIEW);
  }
  return { data: result };
};

const truncate = (s: string, limit: number): string => {
  if (s.length <= limit) {
    return s;
  }
  return `${s.slice(0, limit)}\n... (truncated, ${s.length - limit} more chars)`;
};

//
// Plugin / surface / capability / operation
//

export const shapeListPlugins = (all: Plugin[], opts: ListOptions = {}): ToolResult =>
  shapeList(all, opts, {
    full: (p) => ({ ref: p.ref, id: p.id, name: p.name, package: p.package, description: p.description }),
    compact: (p) => ({ ref: p.ref, id: p.id, name: p.name }),
    truncationHint: 'raise `limit` (max 200), refine with `query`/`pathPrefix`, or call get_plugin directly.',
  });

export const shapeGetPlugin = (detail: PluginDetail): ToolResult => ({
  data: {
    ref: detail.ref,
    id: detail.id,
    name: detail.name,
    package: detail.package,
    description: detail.description,
    entryFile: detail.entryFile,
    meta: detail.meta,
    modules: detail.modules.map((m) => ({ helper: m.helper, id: m.id })),
    surfaces: detail.surfaces.map((s) => ({ ref: s.ref, id: s.id, roles: s.roles })),
    capabilities: detail.capabilities.map((c) => ({ ref: c.ref, key: c.key })),
    operations: detail.operations.map((o) => ({ ref: o.ref, key: o.key, name: o.name })),
  },
});

export const shapeListSurfaces = (all: Surface[], opts: ListOptions = {}): ToolResult =>
  shapeList(all, opts, {
    full: (s) => ({ ref: s.ref, id: s.id, pluginId: s.pluginId, package: s.package, roles: s.roles }),
    compact: (s) => ({ ref: s.ref, id: s.id }),
    truncationHint: 'raise `limit` (max 200) or filter by `pluginId`.',
  });

export const shapeListCapabilities = (all: Capability[], opts: ListOptions = {}): ToolResult =>
  shapeList(all, opts, {
    full: (c) => ({ ref: c.ref, key: c.key, pluginId: c.pluginId, package: c.package }),
    compact: (c) => ({ ref: c.ref, key: c.key }),
    truncationHint: 'raise `limit` (max 200) or filter by `pluginId`.',
  });

export const shapeListOperations = (all: Operation[], opts: ListOptions = {}): ToolResult =>
  shapeList(all, opts, {
    full: (o) => ({
      ref: o.ref,
      key: o.key,
      name: o.name,
      description: o.description,
      pluginId: o.pluginId,
      package: o.package,
    }),
    compact: (o) => ({ ref: o.ref, key: o.key, name: o.name }),
    truncationHint: 'raise `limit` (max 200) or filter by `pluginId`.',
  });

//
// Schemas
//

export const shapeListSchemas = (all: SchemaSummary[], opts: ListOptions = {}): ToolResult =>
  shapeList(all, opts, {
    full: (s) => ({
      ref: s.ref,
      typename: s.typename,
      version: s.version,
      name: s.name,
      package: s.package,
      pluginId: s.pluginId,
      fieldCount: s.fieldCount,
    }),
    compact: (s) => ({ ref: s.ref, typename: s.typename }),
    truncationHint: 'raise `limit` (max 200), filter by `pluginId`/`package`, or call get_schema directly.',
  });

export const shapeGetSchema = (detail: SchemaDetail): ToolResult => ({
  data: {
    ref: detail.ref,
    typename: detail.typename,
    version: detail.version,
    name: detail.name,
    package: detail.package,
    pluginId: detail.pluginId,
    fieldCount: detail.fieldCount,
    fields: detail.fields,
    location: detail.location,
  },
});

export const shapeFindSchemaUsage = (usages: SchemaUsage[], opts: ListOptions = {}): ToolResult =>
  shapeList(usages, opts, {
    full: (u) => ({ file: u.file, package: u.package, line: u.line, snippet: u.snippet }),
    compact: (u) => ({ file: u.file, line: u.line }),
    truncationHint: 'raise `limit` (max 200) or read specific files directly.',
  });
