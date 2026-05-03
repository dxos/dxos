//
// Copyright 2026 DXOS.org
//

// Response shaping for token budgets.

// Default tool responses target ~500 tokens. Lists get truncated with a note
// telling the caller how to refine. Single-record fetches don't get truncated;
// callers opt into heavier fields via `include`.

import type { Package, PackageDetail, SymbolDetail, SymbolMatch } from '@dxos/introspect';

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
