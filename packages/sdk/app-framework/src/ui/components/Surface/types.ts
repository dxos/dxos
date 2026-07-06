//
// Copyright 2023 DXOS.org
//

import type { FC, PropsWithChildren, ReactNode } from 'react';

import type { MakeOptional, Position } from '@dxos/util';

import * as Role from '../../../common/Role';

/**
 * Typed Surface consumer props — carries the role/data-shape contract via a
 * {@link Role.Role}. The `type` prop is required; the string `role` prop has
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
 * {@link Role.Role}. Available as a typed overload of the Surface component so
 * ad-hoc `type` fields on arbitrary spread props don't conflict with the
 * untyped consumer form.
 */
export type TypedProps<TToken extends Role.Role<any>> = {
  fallback?: FC<{ error: Error; data?: any }>;
  placeholder?: ReactNode;
  id?: string;
  type: TToken;
  data?: Role.Data<TToken>;
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
  type: Role.Role<T>;

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

export type ComponentProps<T extends Record<string, any> = Record<string, any>> = {
  /**
   * The resolved role NSID string (e.g. `org.dxos.role.article`). Present on
   * matched components only — multi-role containers can branch on this value
   * by comparing against a token's `.role` (e.g. `role === AppSurface.Section.role`).
   */
  role: string;
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
 * {@link Role.Filter}-based `create` overload).
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
  filter: Role.Filter<T>;
  component: ComponentFunction<T>;
  position?: Position.Position;
}>;

/**
 * Typed Web Component surface definition.
 */
export type TypedWebComponentDefinition<T extends Record<string, any> = any> = Readonly<{
  id: string;
  filter: Role.Filter<T>;
  tagName: string;
  position?: Position.Position;
}>;

const expandBindings = <T extends Record<string, any>>(
  filter: Role.Filter<T>,
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
