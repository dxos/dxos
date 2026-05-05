//
// Copyright 2026 DXOS.org
//

// Response shaping for token budgets.

// Default tool responses target ~500 tokens. Lists get truncated with a note
// telling the caller how to refine. Single-record fetches don't get truncated;
// callers opt into heavier fields via `include`.

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

const LIST_LIMIT = 30;
const SOURCE_PREVIEW = 1200;
const JSDOC_PREVIEW = 600;

export type ToolResult = {
  data: unknown;
  note?: string;
  truncated?: string;
};

export const shapeListPackages = (all: Package[]): ToolResult => {
  const data = all.slice(0, LIST_LIMIT).map((p) => ({
    name: p.name,
    version: p.version,
    private: p.private,
    path: p.path,
    description: p.description,
  }));
  if (all.length > LIST_LIMIT) {
    return {
      data,
      truncated: `${all.length - LIST_LIMIT} more results — refine with name/pathPrefix or call get_package directly.`,
    };
  }
  return { data };
};

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

export const shapeFindSymbol = (matches: SymbolMatch[]): ToolResult => {
  const data = matches.slice(0, LIST_LIMIT).map((m) => ({
    ref: m.ref,
    name: m.name,
    package: m.package,
    kind: m.kind,
    summary: m.summary,
  }));
  if (matches.length > LIST_LIMIT) {
    return {
      data,
      truncated: `${matches.length - LIST_LIMIT} more results — refine the query or filter by kind.`,
    };
  }
  return { data };
};

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

// ---------------------------------------------------------------------------
// Plugin / surface / capability / operation shaping.
// ---------------------------------------------------------------------------

export const shapeListPlugins = (all: Plugin[]): ToolResult => {
  const data = all.slice(0, LIST_LIMIT).map((p) => ({
    ref: p.ref,
    id: p.id,
    name: p.name,
    package: p.package,
    description: p.description,
  }));
  if (all.length > LIST_LIMIT) {
    return {
      data,
      truncated: `${all.length - LIST_LIMIT} more results — refine with query/pathPrefix or call get_plugin directly.`,
    };
  }
  return { data };
};

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

export const shapeListSurfaces = (all: Surface[]): ToolResult => {
  const data = all.slice(0, LIST_LIMIT).map((s) => ({
    ref: s.ref,
    id: s.id,
    pluginId: s.pluginId,
    package: s.package,
    roles: s.roles,
  }));
  if (all.length > LIST_LIMIT) {
    return {
      data,
      truncated: `${all.length - LIST_LIMIT} more results — filter by plugin id.`,
    };
  }
  return { data };
};

export const shapeListCapabilities = (all: Capability[]): ToolResult => {
  const data = all.slice(0, LIST_LIMIT).map((c) => ({
    ref: c.ref,
    key: c.key,
    pluginId: c.pluginId,
    package: c.package,
  }));
  if (all.length > LIST_LIMIT) {
    return {
      data,
      truncated: `${all.length - LIST_LIMIT} more results — filter by plugin id.`,
    };
  }
  return { data };
};

export const shapeListOperations = (all: Operation[]): ToolResult => {
  const data = all.slice(0, LIST_LIMIT).map((o) => ({
    ref: o.ref,
    key: o.key,
    name: o.name,
    description: o.description,
    pluginId: o.pluginId,
    package: o.package,
  }));
  if (all.length > LIST_LIMIT) {
    return {
      data,
      truncated: `${all.length - LIST_LIMIT} more results — filter by plugin id.`,
    };
  }
  return { data };
};

// ---------------------------------------------------------------------------
// Schema shaping.
// ---------------------------------------------------------------------------

export const shapeListSchemas = (all: SchemaSummary[]): ToolResult => {
  const data = all.slice(0, LIST_LIMIT).map((s) => ({
    ref: s.ref,
    typename: s.typename,
    version: s.version,
    name: s.name,
    package: s.package,
    fieldCount: s.fieldCount,
  }));
  if (all.length > LIST_LIMIT) {
    return {
      data,
      truncated: `${all.length - LIST_LIMIT} more results — filter by package or call get_schema directly.`,
    };
  }
  return { data };
};

export const shapeGetSchema = (detail: SchemaDetail): ToolResult => ({
  data: {
    ref: detail.ref,
    typename: detail.typename,
    version: detail.version,
    name: detail.name,
    package: detail.package,
    fieldCount: detail.fieldCount,
    fields: detail.fields,
    location: detail.location,
  },
});

export const shapeFindSchemaUsage = (usages: SchemaUsage[]): ToolResult => {
  const data = usages.slice(0, LIST_LIMIT).map((u) => ({
    file: u.file,
    package: u.package,
    line: u.line,
    snippet: u.snippet,
  }));
  if (usages.length > LIST_LIMIT) {
    return {
      data,
      truncated: `${usages.length - LIST_LIMIT} more references — narrow by reading specific files.`,
    };
  }
  return { data };
};
