//
// Copyright 2026 DXOS.org
//

/**
 * The store's table names. A prefix lets several stores share one database (one memory per space in a host's
 * SQLite) without sharing rows, and keeps their names apart from the host's own tables.
 */
export type Tables = {
  readonly prefix: string;
  readonly quads: string;
  readonly terms: string;
  readonly dts: string;
  readonly meta: string;
};

/** The table names under a prefix (none by default, as stores have always been laid out). */
export const tables = (prefix = ''): Tables => {
  if (!/^[A-Za-z0-9_]*$/.test(prefix)) {
    throw new TypeError(`Table prefix must be letters, digits and underscores: ${prefix}`);
  }
  return { prefix, quads: `${prefix}quads`, terms: `${prefix}terms`, dts: `${prefix}dts`, meta: `${prefix}meta` };
};

export const DEFAULT_TABLES = tables();
