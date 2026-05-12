//
// Copyright 2026 DXOS.org
//

// Shared list-pagination constants used by both the schema definitions
// (`Schema.lessThanOrEqualTo(MAX_LIST_LIMIT)` on every list tool's `limit`
// field) and by the server-side response shapers in @dxos/introspect-mcp.
// Lives here so the contract surface (introspect-tools) doesn't have to
// import from the runtime package.

/** Default number of items returned by list-style tools when no `limit` is passed. */
export const DEFAULT_LIST_LIMIT = 30;

/**
 * Hard ceiling on `limit`. A runaway tool call shouldn't be able to dump every
 * symbol in the monorepo (~thousands) into the model's context. Callers who
 * truly need everything should iterate via filters (pluginId, package, etc.).
 */
export const MAX_LIST_LIMIT = 200;

/**
 * Per-call options every list-style tool accepts. Both fields are optional
 * — the defaults match `DEFAULT_LIST_LIMIT` items, full projection.
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
