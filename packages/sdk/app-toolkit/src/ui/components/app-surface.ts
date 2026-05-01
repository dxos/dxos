//
// Copyright 2025 DXOS.org
//

import type * as Schema from 'effect/Schema';

import { Surface } from '@dxos/app-framework/ui';
import { Obj, Type } from '@dxos/echo';
import { type Space } from '@dxos/react-client/echo';
import { type ProjectionModel } from '@dxos/schema';

import { AppCapabilities } from '../../capabilities';

//
// Internal type helpers
//

type TokenData<T> = T extends Surface.RoleToken<infer D> ? D : never;
type FilterData<F> = F extends Surface.Filter<infer D> ? D : never;
type UnionToIntersection<U> = (U extends any ? (arg: U) => void : never) extends (arg: infer I) => void ? I : never;
type IsAny<T> = 0 extends 1 & T ? true : false;

//
// Combinators
//

/**
 * Filter disjunction across roles. Bindings from each filter are concatenated;
 * the resulting data type is the union.
 *
 * Use this when a single component should render for multiple roles — replaces
 * the legacy `role: ['article', 'section']` array.
 */
export const oneOf = <TFilters extends ReadonlyArray<Surface.Filter<any>>>(
  ...filters: TFilters
): Surface.Filter<FilterData<TFilters[number]>> => {
  const bindings = filters.flatMap((filter) => filter.bindings);
  return { bindings };
};

/**
 * Filter conjunction on a shared role set. All inputs must share the same set
 * of roles (throws otherwise); for each role the guards are combined with `&&`.
 * The resulting data type is the intersection.
 */
export const allOf = <TFilters extends ReadonlyArray<Surface.Filter<any>>>(
  ...filters: TFilters
): Surface.Filter<UnionToIntersection<FilterData<TFilters[number]>>> => {
  if (filters.length === 0) {
    throw new Error('AppSurface.allOf requires at least one filter');
  }
  const rolesPerFilter = filters.map(
    (filter) => new Set(filter.bindings.map((binding: Surface.Binding) => binding.role)),
  );
  const [firstRoles, ...restRoles] = rolesPerFilter;
  for (const roles of restRoles) {
    if (roles.size !== firstRoles.size) {
      throw new Error('AppSurface.allOf requires all filters to share the same role set');
    }
    for (const role of roles) {
      if (!firstRoles.has(role)) {
        throw new Error(`AppSurface.allOf requires all filters to share the same role set; got stray role ${role}`);
      }
    }
  }
  const bindings: Surface.Binding[] = Array.from(firstRoles).map((role) => ({
    role,
    guard: (data: unknown) =>
      filters.every((filter) =>
        // Within a single filter, same-role bindings compose disjunctively (ANY match passes).
        filter.bindings.some((entry: Surface.Binding) => entry.role === role && entry.guard(data)),
      ),
  }));
  return { bindings };
};

//
// Generic filter builders (role-agnostic — take a role token as first argument)
//

/**
 * Filter: matches an ECHO object at the given role token's subject position.
 */
export const object: {
  <TToken extends Surface.RoleToken<{ subject?: any }>, S extends Type.AnyEntity>(
    token: TToken,
    schema: S,
  ): Surface.Filter<Omit<NonNullable<TokenData<TToken>>, 'subject'> & { subject: Schema.Schema.Type<S> }>;
  <TToken extends Surface.RoleToken<{ subject?: any }>, S extends Type.AnyEntity[]>(
    token: TToken,
    schemas: [...S],
  ): Surface.Filter<Omit<NonNullable<TokenData<TToken>>, 'subject'> & { subject: Schema.Schema.Type<S[number]> }>;
} = (token: Surface.RoleToken<any>, schemaOrSchemas: Type.AnyEntity | Type.AnyEntity[]): Surface.Filter<any> => {
  const schemas = Array.isArray(schemaOrSchemas) ? schemaOrSchemas : [schemaOrSchemas];
  const guard = (data: unknown): boolean => {
    if (typeof data !== 'object' || data === null) {
      return false;
    }
    const subject = (data as { subject?: unknown }).subject;
    // Roles whose data contract (ArticleData, ObjectSectionData) requires a
    // string `attendableId`. The runtime guard enforces what the type-level
    // contract declares, so Article/Section/Tabpanel filters only match data
    // that can be fed to components which destructure `attendableId`.
    if (
      (token.role === 'article' || token.role === 'section' || token.role === 'tabpanel') &&
      typeof (data as { attendableId?: unknown }).attendableId !== 'string'
    ) {
      return false;
    }
    return schemas.some((schema) => Obj.instanceOf(schema, subject));
  };
  return { bindings: [{ role: token.role, guard }] };
};

/**
 * Filter: matches when `data.subject === value` (string or null literal).
 *
 * The token's data contract is preserved (e.g. Article carries `attendableId`)
 * and only `subject` is narrowed to the literal.
 */
export const literal = <TToken extends Surface.RoleToken<{ subject?: any }>, T extends string | null>(
  token: TToken,
  value: T,
): Surface.Filter<Omit<NonNullable<TokenData<TToken>>, 'subject'> & { subject: T }> => {
  const guard = (data: unknown): boolean => {
    if (typeof data !== 'object' || data === null) {
      return false;
    }
    return (data as { subject?: unknown }).subject === value;
  };
  return { bindings: [{ role: token.role, guard }] };
};

/**
 * Filter: matches when `data.subject` satisfies the provided predicate.
 *
 * A generic subject-narrowing helper for cases not covered by {@link object}
 * (ECHO instance check) or {@link literal} (identity match). Use e.g. for
 * graph nodes, plugin descriptors, ECHO schemas, or anything with a custom
 * type-guard predicate.
 *
 * The token's data contract is preserved (e.g. Article/Section carry
 * `attendableId`) and only `subject` is narrowed by the predicate.
 */
export const subject: {
  <TToken extends Surface.RoleToken<{ subject?: any }>, T>(
    token: TToken,
    check: (value: unknown) => value is T,
  ): Surface.Filter<Omit<NonNullable<TokenData<TToken>>, 'subject'> & { subject: T }>;
  <TToken extends Surface.RoleToken<{ subject?: any }>>(
    token: TToken,
    check: (value: unknown) => boolean,
  ): Surface.Filter<NonNullable<TokenData<TToken>>>;
} = (token: Surface.RoleToken<any>, check: (value: unknown) => boolean): Surface.Filter<any> => {
  const guard = (data: unknown): boolean => {
    if (typeof data !== 'object' || data === null) {
      return false;
    }
    return check((data as { subject?: unknown }).subject);
  };
  return { bindings: [{ role: token.role, guard }] };
};

/**
 * Filter: matches when `data.subject` is an ECHO snapshot of the given schema.
 * Preserves the token's other data fields (e.g. Article/Section `attendableId`).
 */
export const snapshot = <TToken extends Surface.RoleToken<{ subject?: any }>, S extends Type.AnyEntity>(
  token: TToken,
  schema: S,
): Surface.Filter<
  Omit<NonNullable<TokenData<TToken>>, 'subject'> & { subject: Obj.Snapshot<Schema.Schema.Type<S>> }
> => {
  const guard = (data: unknown): boolean => {
    if (typeof data !== 'object' || data === null) {
      return false;
    }
    return Obj.snapshotOf(schema, (data as { subject?: unknown }).subject);
  };
  return { bindings: [{ role: token.role, guard }] };
};

/**
 * Filter: lifts an ad-hoc predicate into the typed filter world so it composes
 * via {@link allOf} on the same role as `token`.
 */
export const predicate = <TData extends Record<string, unknown>>(
  token: Surface.RoleToken<TData>,
  fn: (data: TData) => boolean,
): Surface.Filter<TData> => {
  const guard = (data: unknown): boolean => {
    try {
      return fn(data as TData);
    } catch {
      return false;
    }
  };
  return { bindings: [{ role: token.role, guard }] };
};

/**
 * Filter: requires `data.companionTo` to match the given schema, literal string,
 * or (with no second argument) any ECHO object. Pair with {@link allOf} and
 * {@link object} to express "article displaying X whose companion is Y".
 */
export const companion: {
  <TToken extends Surface.RoleToken<any>>(token: TToken): Surface.Filter<{ companionTo: Obj.Any }>;
  <TToken extends Surface.RoleToken<any>, S extends Type.AnyEntity>(
    token: TToken,
    schema: S,
  ): Surface.Filter<{ companionTo: Schema.Schema.Type<S> }>;
  <TToken extends Surface.RoleToken<any>, T extends string>(
    token: TToken,
    value: T,
  ): Surface.Filter<{ companionTo: T }>;
} = (token: Surface.RoleToken<any>, schemaOrValue?: Type.AnyEntity | string): Surface.Filter<any> => {
  const guard = (data: unknown): boolean => {
    if (typeof data !== 'object' || data === null) {
      return false;
    }
    const companionTo = (data as { companionTo?: unknown }).companionTo;
    if (schemaOrValue === undefined) {
      return Obj.isObject(companionTo);
    }
    if (typeof schemaOrValue === 'string') {
      return companionTo === schemaOrValue;
    }
    return Obj.instanceOf(schemaOrValue, companionTo);
  };
  return { bindings: [{ role: token.role, guard }] };
};

//
// Article
//

/** Role token for the `article` role. Subject defaults to `any` until narrowed
 * via {@link object}, {@link literal}, or {@link subject}. Extra passthrough
 * props are permitted. */
export const Article: Surface.RoleToken<ArticleData<any>> = Surface.makeType('article');

/** Surface data for article role (from PlankComponent). */
export type ArticleData<Subject = unknown, Props extends {} = {}, CompanionTo = unknown> = {
  attendableId: string;
  subject: Subject;
  properties?: Record<string, any>; // TODO(burdon): What is this for?
  variant?: string;
  path?: string[];
  popoverAnchorId?: string;
} & (unknown extends CompanionTo ? { companionTo?: CompanionTo } : { companionTo: CompanionTo }) &
  Props;

/** Component props for article role. */
export type ArticleProps<Subject = unknown, Props extends {} = {}, CompanionTo = unknown> = ArticleData<
  Subject,
  Props,
  CompanionTo
> & {
  role: 'article' | (string & {});
};

/** Surface data for article-role ECHO object. */
export type ObjectArticleData<
  Subject extends Obj.Unknown | undefined = Obj.Unknown,
  Props extends {} = {},
  CompanionTo = unknown,
> = ArticleData<Subject, Props, CompanionTo>;

/** Component props for article-role ECHO object. */
export type ObjectArticleProps<
  Subject extends Obj.Unknown | undefined = Obj.Unknown,
  Props extends {} = {},
  CompanionTo = unknown,
> = ArticleProps<Subject, Props, CompanionTo>;

/** Component props for article-role plugin settings. */
export type SettingsArticleProps<T extends {}, Props extends {} = {}> = {
  settings: T;
  onSettingsChange?: (cb: (current: T) => T) => void;
} & Props;

/** Filter: matches a plugin-settings article by prefix. */
export const settings = (
  token: Surface.RoleToken<any>,
  prefix: string,
): Surface.Filter<{ subject: AppCapabilities.Settings }> => {
  const guard = (data: unknown): boolean => {
    if (typeof data !== 'object' || data === null) {
      return false;
    }
    const subject = (data as { subject?: unknown }).subject;
    return AppCapabilities.isSettings(subject) && subject.prefix === prefix;
  };
  return { bindings: [{ role: token.role, guard }] };
};

//
// SpaceArticle
//
// Article-shaped surface whose container resolves a Space (typically via
// `useActiveSpace()` in the surface callback). Reuses the `Article` role token
// — the deck plugin keeps passing standard `ArticleData` — and only specializes
// the props the consumer expects by adding a non-null `space` field synthesized
// at the surface boundary.
//

/** Surface data for an article whose container receives a resolved Space.
 *  `subject` from `ArticleData` is widened to optional — Space-scoped articles
 *  often render at routes whose subject is a literal id rather than an object,
 *  and the container reads `space` (synthesized at the surface boundary) instead. */
export type SpaceArticleData<Props extends {} = {}> = Omit<ArticleData<unknown>, 'subject'> & {
  subject?: unknown;
  space: Space;
} & Props;

/** Component props for an article whose container receives a resolved Space. */
export type SpaceArticleProps<Props extends {} = {}> = SpaceArticleData<Props> & {
  role: 'article' | (string & {});
};

//
// Section
//

/** Role token for the `section` role. */
export const Section: Surface.RoleToken<SectionData<any>> = Surface.makeType('section');

/** Role token for the `slide` role. Shares the section data shape. */
export const Slide: Surface.RoleToken<SectionData<any>> = Surface.makeType('slide');

/** Role token for the `tabpanel` role. Shares the article data shape. */
export const Tabpanel: Surface.RoleToken<ArticleData<any>> = Surface.makeType('tabpanel');

/** Role token for the `related` role. Related panels may render in both
 * plank (attendable) and popover (non-attendable) contexts, so `attendableId`
 * is optional here. */
export const Related: Surface.RoleToken<{ attendableId?: string; subject: any }> = Surface.makeType('related');

/**
 * Surface data for section role (from StackSection). Sections always render
 * inside a plank, so `attendableId` is part of the contract.
 */
export type SectionData<Subject = unknown, Props extends {} = {}> = {
  attendableId: string;
  subject: Subject;
} & Props;

/** Component props for section role. */
export type SectionProps<Subject = unknown, Props extends {} = {}> = SectionData<Subject, Props> & {
  role: 'section' | (string & {});
};

/** Surface data for section-role ECHO object. */
export type ObjectSectionData<
  Subject extends Obj.Unknown | undefined = Obj.Unknown,
  Props extends {} = {},
> = SectionData<Subject, Props>;

/** Component props for section-role ECHO object. */
export type ObjectSectionProps<
  Subject extends Obj.Unknown | undefined = Obj.Unknown,
  Props extends {} = {},
> = SectionProps<Subject, Props>;

//
// Object Properties
//

/**
 * Role token for the `object-properties` role (per-object configuration panel).
 * Distinct from Section: no `attendableId` requirement.
 */
export const ObjectProperties: Surface.RoleToken<ObjectPropertiesData<any>> = Surface.makeType('object-properties');

/** Surface data for object-properties surfaces (distinct from section; no attendableId). */
export type ObjectPropertiesData<Subject extends Obj.Unknown | undefined = Obj.Unknown, Props extends {} = {}> = {
  subject: Subject;
} & Props;

/** Component props for object-properties surfaces. */
export type ObjectPropertiesProps<
  Subject extends Obj.Unknown | undefined = Obj.Unknown,
  Props extends {} = {},
> = ObjectPropertiesData<Subject, Props> & {
  role: 'object-properties' | (string & {});
};

//
// Card
//

/** Role token for the `card--content` role. */
export const Card: Surface.RoleToken<CardData<any>> = Surface.makeType('card--content');

/** Surface data for card role. */
export type CardData<Subject = unknown, Props extends {} = {}> = {
  subject: Subject;
  /** Optional projection model (set by form/kanban/pipeline consumers that pre-project the subject). */
  projection?: ProjectionModel;
  /**
   * Optional property paths to omit from the rendered card body. Generic
   * passthrough — callers decide which fields are redundant in their
   * context (e.g. a Kanban hides its pivot field because the column
   * already conveys that value). Cards that render dynamic schemas
   * (Expando) honor this; fixed-shape cards may ignore it.
   */
  ignorePaths?: ReadonlyArray<string>;
} & Props;

/** Component props for card role. */
export type CardProps<Subject = unknown, Props extends {} = {}> = CardData<Subject, Props> & {
  role: 'card--content' | (string & {});
};

/** Surface data for card-role ECHO object. */
export type ObjectCardData<Subject extends Obj.Unknown | undefined = Obj.Unknown, Props extends {} = {}> = CardData<
  Subject,
  Props
>;

/** Component props for card-role ECHO object. */
export type ObjectCardProps<Subject extends Obj.Unknown | undefined = Obj.Unknown, Props extends {} = {}> = CardProps<
  Subject,
  Props
>;

//
// Dialog / Popover
//

/** Role token for the `dialog` role. */
export const Dialog: Surface.RoleToken<DialogData> = Surface.makeType('dialog');

/** Role token for the `popover` role. */
export const Popover: Surface.RoleToken<DialogData> = Surface.makeType('popover');

/**
 * Surface data for dialog/popover role.
 *
 * When `ComponentProps` is left as the default `any`, `props` is optional —
 * unannotated callers can read `data.props` as `any | undefined`. When a caller
 * narrows the shape (e.g. `AppSurface.component<MyProps>(Dialog, id)`), `props`
 * becomes required and `data.props` is `MyProps` — no non-null assertion needed
 * at the spread site.
 */
export type DialogData<Component extends string = string, ComponentProps = any> = {
  component: Component;
} & (IsAny<ComponentProps> extends true ? { props?: ComponentProps } : { props: ComponentProps });

/** Component props for dialog role. */
export type DialogProps<Component extends string = string, ComponentProps extends {} = {}> = DialogData<
  Component,
  ComponentProps
>;

/** Component props for popover role. */
export type PopoverProps<Component extends string = string, ComponentProps extends {} = {}> = DialogData<
  Component,
  ComponentProps
>;

/** Alias for dialog/popover component props. */
export type ComponentProps<Component extends string = string, ComponentProps extends {} = {}> = DialogData<
  Component,
  ComponentProps
>;

/**
 * Filter: matches when `data.component === id`. Pairs with role tokens that
 * use component-based routing, e.g. `Dialog` and `Popover`.
 *
 * The first type parameter narrows `data.props` to the rendered child's
 * expected props shape so the spread `{...data.props}` type-checks at the
 * call site. `Component` is inferred from the `id` argument and rarely needs
 * to be specified; the common override is just `component<MyProps>(Dialog, id)`.
 */
export const component = <ComponentProps = any, Component extends string = string>(
  token: Surface.RoleToken<DialogData>,
  id: Component,
): Surface.Filter<DialogData<Component, ComponentProps>> => {
  const guard = (data: unknown): boolean => {
    return typeof data === 'object' && data !== null && (data as { component?: unknown }).component === id;
  };
  return { bindings: [{ role: token.role, guard }] };
};

//
// Chrome
//

/** Role token for the `navigation` role. */
export const Navigation: Surface.RoleToken<NavigationData> = Surface.makeType('navigation');

/** Role token for the `menu-footer` role. */
export const MenuFooter: Surface.RoleToken<MenuFooterData<unknown>> = Surface.makeType('menu-footer');

/** Role token for the `navbar-end` role. */
export const NavbarEnd: Surface.RoleToken<NavbarEndData<unknown>> = Surface.makeType('navbar-end');

/** Role token for the `document-title` role. */
export const DocumentTitle: Surface.RoleToken<DocumentTitleData<unknown>> = Surface.makeType('document-title');

/** Surface data for navigation role. */
export type NavigationData<Props extends {} = {}> = {
  popoverAnchorId?: string;
  current?: string;
} & Props;

/** Component props for navigation role. */
export type NavigationProps<Props extends {} = {}> = NavigationData<Props> & {
  role: 'navigation' | (string & {});
};

/** Surface data for menu-footer role. */
export type MenuFooterData<Subject = unknown, Props extends {} = {}> = {
  subject: Subject;
} & Props;

/** Component props for menu-footer role. */
export type MenuFooterProps<Subject = unknown, Props extends {} = {}> = MenuFooterData<Subject, Props> & {
  role: 'menu-footer' | (string & {});
};

/** Surface data for navbar-end role. */
export type NavbarEndData<Subject = unknown, Props extends {} = {}> = {
  subject: Subject;
} & Props;

/** Component props for navbar-end role. */
export type NavbarEndProps<Subject = unknown, Props extends {} = {}> = NavbarEndData<Subject, Props> & {
  role: 'navbar-end' | (string & {});
};

/** Surface data for document-title role. */
export type DocumentTitleData<Subject = unknown, Props extends {} = {}> = {
  subject: Subject;
} & Props;

/** Component props for document-title role. */
export type DocumentTitleProps<Subject = unknown, Props extends {} = {}> = DocumentTitleData<Subject, Props> & {
  role: 'document-title' | (string & {});
};
