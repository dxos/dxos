//
// Copyright 2023 DXOS.org
//

import type { FC, PropsWithChildren, ReactNode, RefCallback } from 'react';

import type { MakeOptional, Position } from '@dxos/util';

/**
 * A typed role token. Carries a role string for runtime dispatch plus a phantom
 * data type so consumers using `type={SomeToken}` and providers using
 * `AppSurface.object(SomeToken, ...)` share a single type-level contract.
 *
 * Mint via {@link makeType}.
 */
export type RoleToken<TData> = {
  readonly role: string;
  /** Covariant phantom; never accessed at runtime. */
  readonly _phantom?: TData;
};

/**
 * One entry in a {@link SurfaceFilter} — a role plus the guard that validates
 * the data shape when the Surface dispatcher is matching that role.
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
 * Mints a typed role token. Identity is structural; all tokens with the same
 * `role` string are interchangeable at runtime.
 */
export const makeType = <TData>(role: string): RoleToken<TData> => ({ role });

/**
 * Props that are passed to the Surface component.
 *
 * The role can be provided either as a string via `role` or as a typed
 * {@link RoleToken} via `type`. The typed form narrows `data` to the token's
 * declared shape.
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
} & MakeOptional<CoreProps<T>, 'id' | 'data' | 'role'> & {
    /**
     * Explicitly disallow `type` on the untyped Props overload — if the caller
     * provides `type={AppSurface.X}`, TypeScript must route to the typed
     * overload (where `data` is narrowed by the token). Without this, the
     * catch-all index signature below would accept any `type` value and mask
     * the typed overload entirely.
     */
    type?: undefined;
  } /**
   * Additional props to pass to the component.
   * These props are not used by Surface itself but may be used by components which resolve the surface.
   * Exclude known prop names to prevent overriding well-defined props.
   */ & {
    [K in keyof Record<string, any>]: K extends keyof CoreProps<T> | 'fallback' | 'placeholder' | 'type' ? never : any;
  };

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
 */
export type CoreProps<T extends Record<string, any> = Record<string, unknown>> = PropsWithChildren<{
  /**
   * ID for debugging.
   */
  id: string;

  /**
   * Role defines how the data should be rendered. For new code, prefer the
   * typed overload of the Surface component which takes a {@link RoleToken}
   * via the `type` prop instead — it enforces a role/data contract at compile
   * time.
   */
  role: string;

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
export type ComponentProps<T extends Record<string, any> = Record<string, any>> = CoreProps<T> & {
  ref?: RefCallback<HTMLElement>;
} & Record<string, any>;

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
 */
export type ReactDefinition<T extends Record<string, any> = any> = Readonly<{
  kind: 'react';
  id: string;
  role: string | string[];
  position?: Position;
  component: ComponentFunction<T>;
  filter?: (data: Record<string, unknown>, role?: string) => data is T;
}>;

/**
 * Definition of when a Web Component surface should be rendered.
 */
export type WebComponentDefinition<T extends Record<string, any> = any> = Readonly<{
  kind: 'web-component';
  id: string;
  role: string | string[];
  position?: Position;
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
  position?: Position;
}>;

/**
 * Typed Web Component surface definition.
 */
export type TypedWebComponentDefinition<T extends Record<string, any> = any> = Readonly<{
  id: string;
  filter: SurfaceFilter<T>;
  tagName: string;
  position?: Position;
}>;

const expandBindings = <T extends Record<string, any>>(
  filter: SurfaceFilter<T>,
): { role: string | string[]; guard: (data: Record<string, unknown>, role?: string) => data is T } => {
  const bindings = filter.bindings;
  const roles = Array.from(new Set(bindings.map((binding) => binding.role)));
  const guard = (data: Record<string, unknown>, role?: string): data is T => {
    if (role != null) {
      const binding = bindings.find((entry) => entry.role === role);
      return binding ? binding.guard(data) : false;
    }
    return bindings.some((entry) => entry.guard(data));
  };
  return { role: roles.length === 1 ? roles[0] : roles, guard };
};

/**
 * Creates a React surface definition.
 */
export function create<T extends Record<string, any> = any>(definition: TypedReactDefinition<T>): ReactDefinition<T>;
export function create<T extends Record<string, any> = any>(
  definition: Omit<ReactDefinition<T>, 'kind'>,
): ReactDefinition<T>;
export function create<T extends Record<string, any> = any>(
  definition: TypedReactDefinition<T> | Omit<ReactDefinition<T>, 'kind'>,
): ReactDefinition<T> {
  if (isSurfaceFilter(definition.filter)) {
    const { id, filter, component, position } = definition as TypedReactDefinition<T>;
    const { role, guard } = expandBindings(filter);
    return { kind: 'react', id, role, position, component, filter: guard };
  }
  return { ...(definition as Omit<ReactDefinition<T>, 'kind'>), kind: 'react' };
}

/**
 * Creates a Web Component surface definition.
 */
export function createWeb<T extends Record<string, any> = any>(
  definition: TypedWebComponentDefinition<T>,
): WebComponentDefinition<T>;
export function createWeb<T extends Record<string, any> = any>(
  definition: Omit<WebComponentDefinition<T>, 'kind'>,
): WebComponentDefinition<T>;
export function createWeb<T extends Record<string, any> = any>(
  definition: TypedWebComponentDefinition<T> | Omit<WebComponentDefinition<T>, 'kind'>,
): WebComponentDefinition<T> {
  if (isSurfaceFilter(definition.filter)) {
    const { id, filter, tagName, position } = definition as TypedWebComponentDefinition<T>;
    const { role, guard } = expandBindings(filter);
    return { kind: 'web-component', id, role, position, tagName, filter: guard };
  }
  return { ...(definition as Omit<WebComponentDefinition<T>, 'kind'>), kind: 'web-component' };
}
