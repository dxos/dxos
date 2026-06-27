//
// Copyright 2025 DXOS.org
//

import * as Context from 'effect/Context';
import * as Layer from 'effect/Layer';

import { type URI } from '@dxos/keys';

import type * as Database from './Database';
import type * as Entity from './Entity';
import type * as internal from './internal';
import type * as Key from './Key';
import type * as Ref from './Ref';
import type * as Registry from './Registry';

/**
 * Resolution context.
 * Affects how non-absolute DXNs are resolved.
 */
export interface RefResolutionContext {
  /**
   * Space that the resolution is happening from.
   */
  space?: Key.SpaceId;

  /**
   * Feed that the resolution is happening from.
   * This feed will be searched first, and then the space it belongs to.
   */
  feed?: URI.URI;
}

export interface RefResolverOptions {
  /**
   * Resolution context.
   * Affects how non-absolute DXNs are resolved.
   */
  context?: RefResolutionContext;

  /**
   * Middleware to change the resolved object before returning it.
   * @deprecated On track to be removed.
   */
  middleware?: (obj: internal.AnyProperties) => internal.AnyProperties;
}

/**
 * Manages cross-space database interactions.
 */
export interface Hypergraph extends Database.Queryable {
  /**
   * In-process registry of keyed objects and static schema types.
   * Populated at startup via `registry.add(objects)` / `registry.add(schemas)`.
   * Queries that include no explicit from() clause will fan out to this registry automatically.
   */
  get registry(): Registry.Registry;

  /**
   * Query objects.
   */
  query: Database.QueryFn;

  /**
   * Creates a reference to an existing object in the database.
   *
   * NOTE: The reference may be dangling if the object is not present in the database.
   * NOTE: Difference from `Ref.fromURI`
   * `Ref.fromURI(dxn)` returns an unhydrated reference. The `.load` and `.target` APIs will not work.
   * `db.makeRef(dxn)` is preferable in cases with access to the database.
   */
  makeRef<T extends Entity.Unknown = Entity.Unknown>(uri: URI.URI): Ref.Ref<T>;

  /**
   * @param hostDb Host database for reference resolution.
   * @param middleware Called with the loaded object. The caller may change the object.
   * @returns Result of `onLoad`.
   */
  // TODO(dmaretskyi): Restructure API: Remove middleware.
  createRefResolver(options: RefResolverOptions): Ref.Resolver;

  /**
   * Get a database by space ID.
   * @returns The database for the given space ID, or undefined if not found.
   */
  getDatabase(spaceId: Key.SpaceId): Database.Database | undefined;

  /**
   * Returns a view of this hypergraph confined to the given set of spaces: queries fan out only to
   * those spaces, `getDatabase` returns undefined for any space outside the set, and reference
   * resolution cannot reach a space outside the set. The confinement is structural — spaces outside
   * the set are simply not present in the view, so there is nothing to "deny".
   *
   * Narrow-only: `scoped(a).scoped(b)` yields the intersection `a ∩ b` and can never widen the set.
   * Used to confine an AI agent session to an allowlist of spaces (see `docs/design/agent-firewall.md`).
   */
  scoped(allowlist: readonly Key.SpaceId[]): Hypergraph;
}

/**
 * Optional read-scope service. When present in context, it confines {@link Database.resolve} /
 * {@link Database.query} to `allowlist`: resolution runs against a `scoped` view of the home graph
 * (see {@link Hypergraph.scoped}) and a query explicitly selecting a space outside the allowlist
 * yields nothing. This is the seam that confines a session — e.g. an AI agent — to a set of spaces.
 *
 * Absent from context (the default, non-agent path) ⇒ unconfined (the home `db`), so existing
 * callers are unaffected. Read-scope is deliberately a separate service from `Database.Service` so
 * that broad reads never imply broad writes (writes always target the home `Database.Service`) and
 * so the scope can be provided per-session at process affinity, independent of the space-affinity
 * (shared, cached) database slice. See `docs/design/agent-firewall.md`.
 */
export class Service extends Context.Tag('@dxos/echo/Hypergraph/Service')<
  Service,
  {
    /** Spaces the session may read. Resolution and queries are confined to this set. */
    readonly allowlist: readonly Key.SpaceId[];
  }
>() {}

/**
 * Layer installing read-confinement for a session: provides {@link Service} with `allowlist`, so
 * `Database.resolve` / `Database.query` cannot reach a space outside it. The home `Database.Service`
 * (where writes go) is unaffected — provide this alongside it. See `docs/design/agent-firewall.md`.
 */
export const scopedLayer = (allowlist: readonly Key.SpaceId[]): Layer.Layer<Service> =>
  Layer.succeed(Service, { allowlist });
