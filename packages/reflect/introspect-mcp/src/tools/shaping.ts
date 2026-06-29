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
  Idiom,
  Operation,
  Package,
  PackageDetail,
  Plugin,
  PluginDetail,
  Schema,
  Surface,
  SymbolDetail,
  SymbolMatch,
} from '@dxos/introspect';
import { DEFAULT_LIST_LIMIT, type ListOptions, MAX_LIST_LIMIT } from '@dxos/introspect-tools';

const SOURCE_PREVIEW = 1200;
const JSDOC_PREVIEW = 600;

export type ToolResult = {
  data: unknown;
  note?: string;
  truncated?: string;
};

type ShapeListConfig<T> = {
  /** Full projection — what an LLM gets when `compact` is false/omitted. */
  full: (item: T) => Record<string, unknown>;
  /** Compact projection — ids / typenames / names only. */
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
// Plugin / surface / capability / operation / schema (main's flatter types)
//

export const shapeListPlugins = (all: Plugin[], opts: ListOptions = {}): ToolResult =>
  shapeList(all, opts, {
    full: (p) => ({
      id: p.id,
      package: p.package,
      name: p.name,
      description: p.description,
      icon: p.icon,
      iconHue: p.iconHue,
      tags: p.tags,
      dependsOn: p.dependsOn,
    }),
    compact: (p) => ({ id: p.id, name: p.name }),
    truncationHint: 'raise `limit` (max 200) or filter with `id` substring.',
  });

/**
 * `PluginDetail` is the same shape as `Plugin` plus arrays of contributions.
 * Returned by what would be `get_plugin` if the introspector exposed it; we
 * synthesize this on the MCP side by combining `listPlugins` + the per-id
 * `listSurfaces` / `listCapabilities` / `listOperations` / `listSchemas` calls.
 */
export const shapePluginDetail = (detail: PluginDetail): ToolResult => ({
  data: {
    id: detail.id,
    package: detail.package,
    name: detail.name,
    description: detail.description,
    icon: detail.icon,
    iconHue: detail.iconHue,
    tags: detail.tags,
    dependsOn: detail.dependsOn,
    metaLocation: detail.metaLocation,
    surfaces: detail.surfaces.map((s) => ({ id: s.id, role: s.role })),
    capabilities: detail.capabilities.map((c) => ({ type: c.type })),
    operations: detail.operations.map((o) => ({ type: o.type })),
    schemas: detail.schemas.map((s) => ({ name: s.name, typename: s.typename })),
  },
});

export const shapeListSurfaces = (all: Surface[], opts: ListOptions = {}): ToolResult =>
  shapeList(all, opts, {
    full: (s) => ({ pluginId: s.pluginId, id: s.id, role: s.role, location: s.location }),
    compact: (s) => ({ pluginId: s.pluginId, id: s.id }),
    truncationHint: 'raise `limit` (max 200) or filter by plugin `id`.',
  });

export const shapeListCapabilities = (all: Capability[], opts: ListOptions = {}): ToolResult =>
  shapeList(all, opts, {
    full: (c) => ({ pluginId: c.pluginId, type: c.type, location: c.location }),
    compact: (c) => ({ pluginId: c.pluginId, type: c.type }),
    truncationHint: 'raise `limit` (max 200) or filter by plugin `id`.',
  });

export const shapeListOperations = (all: Operation[], opts: ListOptions = {}): ToolResult =>
  shapeList(all, opts, {
    full: (o) => ({ pluginId: o.pluginId, type: o.type, location: o.location }),
    compact: (o) => ({ pluginId: o.pluginId, type: o.type }),
    truncationHint: 'raise `limit` (max 200) or filter by plugin `id`.',
  });

export const shapeListSchemas = (all: Schema[], opts: ListOptions = {}): ToolResult =>
  shapeList(all, opts, {
    full: (s) => ({ pluginId: s.pluginId, name: s.name, typename: s.typename, location: s.location }),
    compact: (s) => ({ pluginId: s.pluginId, name: s.name, typename: s.typename }),
    truncationHint: 'raise `limit` (max 200) or filter by plugin `id`.',
  });

//
// Idioms
//

export const shapeListIdioms = (all: Idiom[], opts: ListOptions = {}): ToolResult =>
  shapeList(all, opts, {
    full: (idiom) => ({
      slug: idiom.slug,
      summary: idiom.summary,
      applies: idiom.applies,
      insteadOf: idiom.insteadOf,
      uses: idiom.uses,
      related: idiom.related,
      host: {
        file: idiom.host.file,
        line: idiom.host.line,
        symbol: idiom.host.symbol,
        kind: idiom.host.kind,
      },
    }),
    compact: (idiom) => ({
      slug: idiom.slug,
      kind: idiom.host.kind,
      file: idiom.host.file,
      symbol: idiom.host.symbol,
    }),
    truncationHint: 'raise `limit` (max 200), refine with `slug`, or filter by `hostKind`.',
  });
