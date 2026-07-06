//
// Copyright 2023 DXOS.org
//

// @import-as-namespace

import type { DXN } from '@dxos/keys';
import { log } from '@dxos/log';

/**
 * A typed role token. Carries a role NSID for runtime dispatch plus a phantom
 * data type so consumers using `type={SomeToken}` and providers using
 * `AppSurface.object(SomeToken, ...)` share a single type-level contract.
 *
 * Mint via {@link make}. The `role` field holds the bare NSID (e.g.
 * `org.dxos.role.article`) — the dispatch key, `data-role` attribute value,
 * and what `.role` comparisons inside matched components see.
 */
export type Role<TData> = {
  readonly role: string;
  /** Covariant phantom; never accessed at runtime. */
  readonly _phantom?: TData;
};

/**
 * One entry in a {@link Filter} — a role NSID plus the guard that validates the
 * data shape when the Surface dispatcher is matching that role.
 */
export type Binding = {
  readonly role: string;
  readonly guard: (data: unknown) => boolean;
};

/**
 * Typed filter binding for `Surface.create`. Combines one or more `(role, guard)`
 * pairs so a provider can register against multiple roles while keeping the
 * role and its data shape in a single expression.
 */
export type Filter<TData> = {
  readonly bindings: ReadonlyArray<Binding>;
  /** Covariant phantom; never accessed at runtime. */
  readonly _phantom?: TData;
};

/**
 * Narrow data type carried by a role token.
 */
export type Data<T> = T extends Role<infer D> ? D : never;

/**
 * Runtime guard for {@link Filter}. Distinguishes new-style filter bindings from
 * legacy predicate filters.
 */
export const isFilter = (value: unknown): value is Filter<any> =>
  typeof value === 'object' && value !== null && Array.isArray((value as { bindings?: unknown }).bindings);

/**
 * Mints a typed role token. The NSID is validated at compile time via
 * {@link DXN.Name}: the final segment must be camelCase (no hyphens).
 * Dynamic NSIDs (template-literal / runtime strings) are validated at runtime.
 *
 * Identity is structural; all tokens with the same `role` string are
 * interchangeable at runtime.
 */
export const make: {
  <TData = unknown, T extends string = string>(
    nsid: [DXN.Name<T>] extends [never] ? `Invalid NSID "${T}": final segment must be camelCase (no hyphens)` : T,
  ): Role<TData>;
} = <TData>(nsid: string): Role<TData> => {
  // Runtime guard for dynamic NSIDs that bypass the compile-time DXN.Name<T> check.
  if (
    typeof nsid !== 'string' ||
    !/^[a-zA-Z]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(\.[a-zA-Z][a-zA-Z0-9]{0,62})$/.test(
      nsid,
    )
  ) {
    throw new Error(
      `Invalid role NSID: "${nsid}". Must be a dotted name with a camelCase final segment (no hyphens in the last segment).`,
    );
  }
  return { role: nsid };
};

/**
 * Creates a {@link Filter} from a role token and an optional guard.
 *
 * When `guard` is omitted the filter matches any data at the token's role
 * (role-only dispatch). Pass a guard to add runtime data-shape validation on
 * top of the role match.
 *
 * This is the framework-level primitive; `@dxos/app-toolkit` builds richer
 * domain-aware helpers (ECHO schema checks, literal matching, etc.) on top of it.
 */
export const makeFilter = <TData>(token: Role<TData>, guard?: (data: TData) => boolean): Filter<TData> => {
  const boundGuard =
    guard == null
      ? () => true
      : (data: unknown): boolean => {
          try {
            return guard(data as TData);
          } catch (err) {
            log.catch(err);
            return false;
          }
        };
  return { bindings: [{ role: token.role, guard: boundGuard }] };
};
