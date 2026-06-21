//
// Copyright 2023 DXOS.org
//

import type { FC, PropsWithChildren, ReactNode, Ref } from 'react';

import type { DXN } from '@dxos/keys';
import { log } from '@dxos/log';
import type { MakeOptional, Position } from '@dxos/util';

/**
 * A typed role token. Carries a role NSID for runtime dispatch plus a phantom
 * data type so consumers using `type={SomeToken}` and providers using
 * `AppSurface.object(SomeToken, ...)` share a single type-level contract.
 *
 * Mint via {@link makeType}. The `role` field holds the bare NSID (e.g.
 * `org.dxos.role.article`) — the dispatch key, `data-role` attribute value,
 * and what `.role` comparisons inside matched components see.
 */
export type RoleToken<TData> = {
  readonly role: string;
  /** Covariant phantom; never accessed at runtime. */
  readonly _phantom?: TData;
};

/**
 * One entry in a {@link SurfaceFilter} — a role NSID plus the guard that
 * validates the data shape when the Surface dispatcher is matching that role.
 */
export type SurfaceBinding = {
  readonly role: string;
  readonly guard: (data: unknown) => boolean;
};

/**
 * Typed filter binding for {@link create}. Combines one or more `(role, guard)`
 * pairs so a provider can register against multiple roles while keeping the
 * role and its data shape in a single expression.
 */
export type SurfaceFilter<TData> = {
  readonly bindings: ReadonlyArray<SurfaceBinding>;
  /** Covariant phantom; never accessed at runtime. */
  readonly _phantom?: TData;
};

/**
 * Narrow data type carried by a role token.
 */
export type TokenData<T> = T extends RoleToken<infer D> ? D : never;

/**
 * Runtime guard for {@link SurfaceFilter}. Distinguishes new-style filter
 * bindings from legacy predicate filters.
 */
export const isSurfaceFilter = (value: unknown): value is SurfaceFilter<any> =>
  typeof value === 'object' && value !== null && Array.isArray((value as { bindings?: unknown }).bindings);

/**
 * Mints a typed role token. The NSID is validated at compile time via
 * {@link DXN.Name}: the final segment must be camelCase (no hyphens).
 * Dynamic NSIDs (template-literal / runtime strings) are validated at runtime.
 *
 * Identity is structural; all tokens with the same `role` string are
 * interchangeable at runtime.
 */
export const makeType: {
  <TData = unknown, T extends string = string>(
    nsid: [DXN.Name<T>] extends [never] ? `Invalid NSID "${T}": final segment must be camelCase (no hyphens)` : T,
  ): RoleToken<TData>;
} = <TData>(nsid: string): RoleToken<TData> => {
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
 * Creates a {@link SurfaceFilter} from a role token and an optional guard.
 *
 * When `guard` is omitted the filter matches any data at the token's role
 * (role-only dispatch). Pass a guard to add runtime data-shape validation on
 * top of the role match.
 *
 * This is the framework-level primitive; `@dxos/app-toolkit` builds richer
 * domain-aware helpers (ECHO schema checks, literal matching, etc.) on top of it.
 */
export const makeFilter = <TData>(token: RoleToken<TData>, guard?: (data: TData) => boolean): SurfaceFilter<TData> => {
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

/**
 * Typed Surface consumer props — carries the role/data-shape contract via a
 * {@link RoleToken}. The `type` prop is required; the string `role` prop has
 * been removed from the consumer-facing API.
 */
export type Props<T extends Record<string, any> = Record<string, unknown>> = {
  /**
   * If specified, the Surface will be wrapped in an error boundary.
   * The fallback component will be rendered if an error occurs.
   */
  fallback?: FC<{ error: Error; data?: any }>;

  /**
   * If specified, the Surface will be wrapped in a suspense boundary.
   * The placeholder component will be rendered while the surface component is loading.
   */
  placeholder?: ReactNode;
} & MakeOptional<CoreProps<T>, 'id' | 'data'>;

/**
 * Typed Surface consumer props — carries the role/data-shape contract via a
 * {@link RoleToken}. Available as a typed overload of the Surface component so
 * ad-hoc `type` fields on arbitrary spread props don't conflict with the
 * untyped consumer form.
 */
export type TypedProps<TToken extends RoleToken<any>> = {
  fallback?: FC<{ error: Error; data?: any }>;
  placeholder?: ReactNode;
  id?: string;
  type: TToken;
  data?: TokenData<TToken>;
  limit?: number | undefined;
} & {
  /**
   * Additional pass-through props. Known prop names are excluded so the
   * catch-all doesn't widen `data` / `type` / etc. to `any` at the intersection.
   */
  [K in keyof Record<string, any>]: K extends 'fallback' | 'placeholder' | 'id' | 'type' | 'data' | 'limit'
    ? never
    : any;
};

/**
 * NOTE: If `[key: string]: unknown` is included in shared types, when re-used other fields become unknown as well.
 * The `type` prop is the only way to set the role; it is required here and
 * optional in {@link Props} via MakeOptional.
 */
export type CoreProps<T extends Record<string, any> = Record<string, unknown>> = PropsWithChildren<{
  /**
   * ID for debugging.
   */
  id: string;

  /**
   * The role token defining how the data should be rendered.
   */
  type: RoleToken<T>;

  /**
   * The data to be rendered by the surface.
   * NOTE: This must be a stable value.
   */
  data: T;

  /**
   * If more than one component is resolved, the limit determines how many are rendered.
   */
  limit?: number | undefined;
}>;

// TODO(burdon): Remove ref since relying on this would be error prone.
export type ComponentProps<T extends Record<string, any> = Record<string, any>> = {
  /**
   * The resolved role NSID string (e.g. `org.dxos.role.article`). Present on
   * matched components only — multi-role containers can branch on this value
   * by comparing against a token's `.role` (e.g. `role === AppSurface.Section.role`).
   */
  role: string;
  ref?: Ref<HTMLElement>;
} & PropsWithChildren<{
  id: string;
  data: T;
  limit?: number | undefined;
}> &
  Record<string, any>;

/**
 * React component used to render a surface once is has matched.
 */
export type ComponentFunction<T extends Record<string, any> = Record<string, any>> = (
  props: ComponentProps<T>,
) => ReactNode;

/**
 * Definition of when a React component surface should be rendered.
 *
 * The optional `filter` receives the consumer-supplied `role` as its second
 * argument so a single definition can encode role-specific guards (used by the
 * {@link SurfaceFilter}-based `create` overload).
 *
 * @internal The `role` field is populated by the framework from the filter
 *   bindings and is not authored directly.
 */
export type ReactDefinition<T extends Record<string, any> = any> = Readonly<{
  kind: 'react';
  id: string;
  role: string | string[];
  position?: Position.Position;
  component: ComponentFunction<T>;
  filter?: (data: Record<string, unknown>, role?: string) => data is T;
}>;

/**
 * Definition of when a Web Component surface should be rendered.
 *
 * @internal The `role` field is populated by the framework from the filter
 *   bindings and is not authored directly.
 */
export type WebComponentDefinition<T extends Record<string, any> = any> = Readonly<{
  kind: 'web-component';
  id: string;
  role: string | string[];
  position?: Position.Position;
  /**
   * The tag name of the Web Component to render.
   * The Web Component will receive the same props as React surfaces via properties/attributes.
   */
  tagName: string;
  filter?: (data: Record<string, unknown>, role?: string) => data is T;
}>;

/**
 * Definition of when a surface (React or Web Component) should be rendered.
 */
export type Definition<T extends Record<string, any> = any> = ReactDefinition<T> | WebComponentDefinition<T>;

/**
 * Typed React surface definition — role is derived from the filter's bindings.
 */
export type TypedReactDefinition<T extends Record<string, any> = any> = Readonly<{
  id: string;
  filter: SurfaceFilter<T>;
  component: ComponentFunction<T>;
  position?: Position.Position;
}>;

/**
 * Typed Web Component surface definition.
 */
export type TypedWebComponentDefinition<T extends Record<string, any> = any> = Readonly<{
  id: string;
  filter: SurfaceFilter<T>;
  tagName: string;
  position?: Position.Position;
}>;

const expandBindings = <T extends Record<string, any>>(
  filter: SurfaceFilter<T>,
): { role: string | string[]; guard: (data: Record<string, unknown>, role?: string) => data is T } => {
  const bindings = filter.bindings;
  const roles = Array.from(new Set(bindings.map((binding) => binding.role)));
  const guard = (data: Record<string, unknown>, role?: string): data is T => {
    if (role != null) {
      // Multiple bindings may share a role (e.g. via `oneOf` of same-role filters);
      // the role matches if ANY of them passes.
      return bindings.some((entry) => entry.role === role && entry.guard(data));
    }
    return bindings.some((entry) => entry.guard(data));
  };
  return { role: roles.length === 1 ? roles[0] : roles, guard };
};

/**
 * Validates that a surface or extension local ID follows NSID conventions:
 * each dot-separated segment must be alphanumeric, and the final segment must
 * be camelCase (no hyphens). This mirrors the rule enforced when the id is
 * appended to a plugin's NSID to form a full DXN path.
 *
 * @example Valid:   'about', 'integrationArticle', 'article.journal'
 * @example Invalid: 'integration-article', 'plugin-spec'
 */
const validateLocalId = (id: string): void => {
  const segments = id.split('.');
  const finalSegment = segments[segments.length - 1];
  if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(finalSegment)) {
    throw new Error(
      `Invalid surface id: "${id}". The final segment "${finalSegment}" must be camelCase (letters and digits only, starting with a letter — no hyphens or underscores).`,
    );
  }
};

/**
 * Creates a React surface definition from a typed filter.
 */
export function create<T extends Record<string, any> = any>(definition: TypedReactDefinition<T>): ReactDefinition<T>;
export function create<T extends Record<string, any> = any>(definition: TypedReactDefinition<T>): ReactDefinition<T> {
  validateLocalId(definition.id);
  const { id, filter, component, position } = definition;
  const { role, guard } = expandBindings(filter);
  return { kind: 'react', id, role, position, component, filter: guard };
}

/**
 * Creates a Web Component surface definition from a typed filter.
 */
export function createWeb<T extends Record<string, any> = any>(
  definition: TypedWebComponentDefinition<T>,
): WebComponentDefinition<T>;
export function createWeb<T extends Record<string, any> = any>(
  definition: TypedWebComponentDefinition<T>,
): WebComponentDefinition<T> {
  validateLocalId(definition.id);
  const { id, filter, tagName, position } = definition;
  const { role, guard } = expandBindings(filter);
  return { kind: 'web-component', id, role, position, tagName, filter: guard };
}
