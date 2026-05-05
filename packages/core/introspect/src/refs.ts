//
// Copyright 2026 DXOS.org
//

// Stable string refs so query results round-trip cleanly.
//
// Symbol refs are `<package>#<name>`, e.g. `@dxos/echo-schema#Expando`.
// Package names may include a scope (`@dxos/foo`) so the package portion may itself
// contain an `@` — split on the last `#`.
//
// Plugin-related refs use a colon-prefixed scheme so they don't collide with symbol refs:
//   plugin:<id>                              — `plugin:org.dxos.plugin.markdown`
//   surface:<plugin-id-or-pkg>:<surface-id>  — `surface:org.dxos.plugin.markdown:surface.document`
//   capability:<key>@<plugin-id-or-pkg>      — `capability:Capabilities.ReactSurface@org.dxos.plugin.markdown`
//   operation:<key>                          — `operation:org.dxos.function.markdown.create`

export type SymbolRefParts = {
  kind: 'symbol';
  package: string;
  name: string;
};

export type PluginRefParts = {
  kind: 'plugin';
  id: string;
};

export type SurfaceRefParts = {
  kind: 'surface';
  /** Either a plugin id (org.dxos.plugin.x) or a package name. */
  owner: string;
  id: string;
};

export type CapabilityRefParts = {
  kind: 'capability';
  key: string;
  owner: string;
};

export type OperationRefParts = {
  kind: 'operation';
  key: string;
};

export type SchemaRefParts = {
  kind: 'schema';
  typename: string;
};

export type RefParts =
  | SymbolRefParts
  | PluginRefParts
  | SurfaceRefParts
  | CapabilityRefParts
  | OperationRefParts
  | SchemaRefParts;

export const formatSymbolRef = (pkg: string, name: string): string => `${pkg}#${name}`;
export const formatPluginRef = (id: string): string => `plugin:${id}`;
export const formatSurfaceRef = (owner: string, id: string): string => `surface:${owner}:${id}`;
export const formatCapabilityRef = (key: string, owner: string): string => `capability:${key}@${owner}`;
export const formatOperationRef = (key: string): string => `operation:${key}`;
export const formatSchemaRef = (typename: string): string => `schema:${typename}`;

export const parseRef = (ref: string): RefParts => {
  if (ref.startsWith('plugin:')) {
    const id = ref.slice('plugin:'.length);
    if (id.length > 0) {
      return { kind: 'plugin', id };
    }
  } else if (ref.startsWith('surface:')) {
    const rest = ref.slice('surface:'.length);
    // Split on the LAST `:` so plugin/owner ids that themselves contain `:` (none today,
    // but defensive) round-trip safely.
    const idx = rest.lastIndexOf(':');
    if (idx > 0) {
      const owner = rest.slice(0, idx);
      const id = rest.slice(idx + 1);
      if (owner.length > 0 && id.length > 0) {
        return { kind: 'surface', owner, id };
      }
    }
  } else if (ref.startsWith('capability:')) {
    const rest = ref.slice('capability:'.length);
    // Capability keys are JS identifiers (no `@`), but owners may be scoped
    // package names like `@dxos/plugin-foo`. Split on the FIRST `@` so scoped
    // owners round-trip correctly — `lastIndexOf` would land on the `@` inside
    // `@dxos` and misattribute the package scope to the key.
    const idx = rest.indexOf('@');
    if (idx > 0) {
      const key = rest.slice(0, idx);
      const owner = rest.slice(idx + 1);
      if (key.length > 0 && owner.length > 0) {
        return { kind: 'capability', key, owner };
      }
    }
  } else if (ref.startsWith('operation:')) {
    const key = ref.slice('operation:'.length);
    if (key.length > 0) {
      return { kind: 'operation', key };
    }
  } else if (ref.startsWith('schema:')) {
    const typename = ref.slice('schema:'.length);
    if (typename.length > 0) {
      return { kind: 'schema', typename };
    }
  } else {
    const hash = ref.lastIndexOf('#');
    if (hash > 0) {
      const pkg = ref.slice(0, hash);
      const name = ref.slice(hash + 1);
      if (pkg.length > 0 && name.length > 0) {
        return { kind: 'symbol', package: pkg, name };
      }
    }
  }

  throw new Error(`Invalid ref: ${ref}`);
};

export const isSymbolRef = (ref: string): boolean => {
  try {
    return parseRef(ref).kind === 'symbol';
  } catch {
    return false;
  }
};
