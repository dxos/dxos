//
// Copyright 2025 DXOS.org
//

import type * as Schema from 'effect/Schema';
import type * as SchemaAST from 'effect/SchemaAST';

import { Role } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { Entity, Obj, Type } from '@dxos/echo';
import { log } from '@dxos/log';
import { type Space } from '@dxos/react-client/echo';
import { type ProjectionModel } from '@dxos/schema';

import { AppCapabilities } from '../../app-framework';

//
// Internal type helpers
//

type TokenData<T> = T extends Role.Role<infer D> ? D : never;
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
  const rolesPerFilter = filters.map((filter) => new Set(filter.bindings.map((binding: Surface.Binding) => binding.role)));
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
 *
 * An optional `predicate` narrows on the rest of the data — most useful for
 * surfaces that distinguish variants by a flag (e.g. `editable`, `compact`)
 * without having to hand-roll a fully typed `Surface.Filter`.
 */
export const object: {
  <TToken extends Role.Role<{ subject?: any }>, S extends Type.AnyEntity>(
    token: TToken,
    schema: S,
    predicate?: (data: NonNullable<TokenData<TToken>>) => boolean,
  ): Surface.Filter<Omit<NonNullable<TokenData<TToken>>, 'subject'> & { subject: Type.InstanceType<S> }>;
  <TToken extends Role.Role<{ subject?: any }>, S extends Type.AnyEntity[]>(
    token: TToken,
    schemas: [...S],
    predicate?: (data: NonNullable<TokenData<TToken>>) => boolean,
  ): Surface.Filter<Omit<NonNullable<TokenData<TToken>>, 'subject'> & { subject: Type.InstanceType<S[number]> }>;
} = (
  token: Role.Role<any>,
  schemaOrSchemas: Type.AnyEntity | Type.AnyEntity[],
  predicate?: (data: any) => boolean,
): Surface.Filter<any> => {
  const schemas = (Array.isArray(schemaOrSchemas) ? schemaOrSchemas : [schemaOrSchemas]) as Array<
    Type.AnyObj | Type.AnyRelation
  >;
  const guard = (data: unknown): boolean => {
    if (typeof data !== 'object' || data === null) {
      return false;
    }
    const subject = (data as { subject?: unknown }).subject;
    // Roles whose data contract (ArticleData, ObjectSectionData) requires a
    // string `attendableId`. The runtime guard enforces what the type-level
    // contract declares.
    if (ATTENDABLE_ROLES.has(token.role) && typeof (data as { attendableId?: unknown }).attendableId !== 'string') {
      return false;
    }
    if (!schemas.some((schema) => Entity.instanceOf(schema, subject))) {
      return false;
    }
    return predicate ? predicate(data) : true;
  };
  return Surface.makeFilter(token, guard);
};

/**
 * Filter: matches when `data.subject === value` (string or null literal).
 *
 * The token's data contract is preserved (e.g. Article carries `attendableId`)
 * and only `subject` is narrowed to the literal.
 */
export const literal = <TToken extends Role.Role<{ subject?: any }>, T extends string | null>(
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
  <TToken extends Role.Role<{ subject?: any }>, T>(
    token: TToken,
    check: (value: unknown) => value is T,
  ): Surface.Filter<Omit<NonNullable<TokenData<TToken>>, 'subject'> & { subject: T }>;
  <TToken extends Role.Role<{ subject?: any }>>(
    token: TToken,
    check: (value: unknown) => boolean,
  ): Surface.Filter<NonNullable<TokenData<TToken>>>;
} = (token: Role.Role<any>, check: (value: unknown) => boolean): Surface.Filter<any> => {
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
export const snapshot = <TToken extends Role.Role<{ subject?: any }>, S extends Type.Obj<any>>(
  token: TToken,
  schema: S,
): Surface.Filter<Omit<NonNullable<TokenData<TToken>>, 'subject'> & { subject: Obj.Snapshot<Type.InstanceType<S>> }> => {
  const guard = (data: unknown): boolean => {
    if (typeof data !== 'object' || data === null) {
      return false;
    }
    return Obj.snapshotOf(schema, (data as { subject?: unknown }).subject);
  };
  return { bindings: [{ role: token.role, guard }] };
};

/**
 * Filter: requires `data.companionTo` to match the given schema, literal string,
 * type predicate, or (with no second argument) any ECHO object. Pair with
 * {@link allOf} and {@link object} to express "article displaying X whose companion is Y".
 */
export const companion: {
  <TToken extends Role.Role<any>>(token: TToken): Surface.Filter<{ companionTo: Obj.Any }>;
  <TToken extends Role.Role<any>, S extends Type.AnyEntity>(
    token: TToken,
    schema: S,
  ): Surface.Filter<{ companionTo: Type.InstanceType<S> }>;
  <TToken extends Role.Role<any>, T extends string>(token: TToken, value: T): Surface.Filter<{ companionTo: T }>;
  <TToken extends Role.Role<any>, T>(
    token: TToken,
    guard: (value: unknown) => value is T,
  ): Surface.Filter<{ companionTo: T }>;
} = (
  token: Role.Role<any>,
  schemaOrValueOrGuard?: Type.AnyEntity | string | ((value: unknown) => boolean),
): Surface.Filter<any> => {
  const guard = (data: unknown): boolean => {
    if (typeof data !== 'object' || data === null) {
      return false;
    }
    const companionTo = (data as { companionTo?: unknown }).companionTo;
    if (schemaOrValueOrGuard === undefined) {
      return Obj.isObject(companionTo);
    }
    if (Type.isType(schemaOrValueOrGuard)) {
      return Entity.instanceOf(schemaOrValueOrGuard as Type.AnyEntity, companionTo);
    }
    if (typeof schemaOrValueOrGuard === 'function') {
      return schemaOrValueOrGuard(companionTo);
    }
    if (typeof schemaOrValueOrGuard === 'string') {
      return companionTo === schemaOrValueOrGuard;
    }
    return false;
  };
  return { bindings: [{ role: token.role, guard }] };
};

//
// Article
//

/** Role token for the `article` role. Subject defaults to `any` until narrowed
 * via {@link object}, {@link literal}, or {@link subject}. Extra passthrough
 * props are permitted. */
export const Article: Role.Role<ArticleData<any>> = Role.make('org.dxos.role.article');

/** Surface data for article role (from PlankComponent). */
export type ArticleData<Subject = unknown, Props extends {} = {}, CompanionTo = unknown> = {
  attendableId: string;
  subject: Subject;
  properties?: Record<string, any>; // TODO(burdon): What is this for?
  variant?: string;
  path?: string[];
  popoverAnchorId?: string;
  /**
   * Set when the surface is sized by its container (e.g. a user-resized embed) rather than its
   * intrinsic content, so the surface can fit its content to the box instead of sizing to it.
   */
  extrinsic?: boolean;
} & (unknown extends CompanionTo ? { companionTo?: CompanionTo } : { companionTo: CompanionTo }) &
  Props;

/** Component props for article role. */
export type ArticleProps<Subject = unknown, Props extends {} = {}, CompanionTo = unknown> = ArticleData<
  Subject,
  Props,
  CompanionTo
> & {
  role?: string;
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

//
// SpaceArticle
//
// Article-shaped surface whose container resolves a Space (typically via
// `useActiveSpace()` in the surface callback). Reuses the `Article` role token
// — the deck plugin keeps passing standard `ArticleData` — and only specializes
// the props the consumer expects by adding a non-null `space` field synthesized
// at the surface boundary.
//

/**
 * Surface data for an article whose container receives a resolved Space.
 * `subject` from `ArticleData` is widened to optional — Space-scoped articles
 * often render at routes whose subject is a literal id rather than an object,
 * and the container reads `space` (synthesized at the surface boundary) instead.
 */
export type SpaceArticleData<Props extends {} = {}> = Omit<ArticleData<unknown>, 'subject'> & {
  subject?: unknown;
  space: Space;
} & Props;

/** Component props for an article whose container receives a resolved Space. */
export type SpaceArticleProps<Props extends {} = {}> = SpaceArticleData<Props> & {
  role?: string;
};

//
// Settings
//
// Plugin settings render as article-role planks whose subject is an
// `AppCapabilities.Settings` entry (the deck's PlankComponent dispatches every
// plank under the `article` role). The `settings` filter narrows those planks
// to a settings subject; `SettingsProps` is the contract a settings panel
// component receives once `useSettingsState` has resolved the contributed atom.
//

/** Surface data for a plugin-settings article (subject is an `AppCapabilities.Settings` entry). */
export type SettingsData<Props extends {} = {}> = {
  subject: AppCapabilities.Settings;
} & Props;

/** Component props for a plugin-settings panel. */
export type SettingsProps<T extends {}, Props extends {} = {}> = {
  settings: T;
  onSettingsChange?: (cb: (current: T) => T) => void;
} & Props;

/**
 * Filter: matches a plugin-settings article. When `prefix` is omitted the
 * filter matches any settings subject (used by the generic default settings
 * surface); pass a `prefix` to match a single plugin's settings.
 */
export const settings = (token: Role.Role<any>, prefix?: string): Surface.Filter<SettingsData> => {
  const guard = (data: unknown): boolean => {
    if (typeof data !== 'object' || data === null) {
      return false;
    }

    const subject = (data as { subject?: unknown }).subject;
    return AppCapabilities.isSettings(subject) && (prefix === undefined || subject.prefix === prefix);
  };
  return { bindings: [{ role: token.role, guard }] };
};

//
// Section
//

/** Role token for the `section` role. */
export const Section: Role.Role<SectionData<any>> = Role.make('org.dxos.role.section');

/** Role token for the `slide` role. Shares the section data shape. */
export const Slide: Role.Role<SectionData<any>> = Role.make('org.dxos.role.slide');

/** Role token for the `tabpanel` role. Shares the article data shape. */
export const Tabpanel: Role.Role<ArticleData<any>> = Role.make('org.dxos.role.tabpanel');

/** Roles whose data contract requires a string `attendableId`. */
const ATTENDABLE_ROLES = new Set([Article.role, Section.role, Tabpanel.role]);

/**
 * Role token for the `related` role. Related panels may render in both
 * plank (attendable) and popover (non-attendable) contexts, so `attendableId`
 * is optional here.
 */
export const Related: Role.Role<{ attendableId?: string; subject: any }> = Role.make('org.dxos.role.related');

/**
 * Surface data for section role (from StackSection). Sections always render
 * inside a plank, so `attendableId` is part of the contract.
 */
export type SectionData<Subject = unknown, Props extends {} = {}> = {
  attendableId: string;
  subject: Subject;
  /**
   * Set when the section is sized by its container (e.g. a user-resized embed) rather than its
   * intrinsic content, so the surface can fit its content to the box instead of sizing to it.
   */
  extrinsic?: boolean;
} & Props;

/** Component props for section role. */
export type SectionProps<Subject = unknown, Props extends {} = {}> = SectionData<Subject, Props> & {
  role?: string;
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
 * Role token for the `objectProperties` role (per-object configuration panel).
 * Distinct from Section: no `attendableId` requirement.
 */
export const ObjectProperties: Role.Role<ObjectPropertiesData<any>> = Role.make('org.dxos.role.objectProperties');

/** Surface data for object-properties surfaces (distinct from section; no attendableId). */
export type ObjectPropertiesData<Subject extends Obj.Unknown | undefined = Obj.Unknown, Props extends {} = {}> = {
  subject: Subject;
} & Props;

/** Component props for object-properties surfaces. */
export type ObjectPropertiesProps<
  Subject extends Obj.Unknown | undefined = Obj.Unknown,
  Props extends {} = {},
> = ObjectPropertiesData<Subject, Props> & {
  role?: string;
};

//
// Card
//

/** Role token for the card slot. */
export const CardContent: Role.Role<CardData<any>> = Role.make('org.dxos.role.cardContent');

/** Surface data for card role. */
export type CardData<Subject = unknown, Props extends {} = {}> = {
  subject: Subject;
  /** Optional projection model (set by form/kanban/pipeline consumers that pre-project the subject). */
  projection?: ProjectionModel;
  /** Paths to omit from the card body (caller-defined redundancy; e.g. Kanban hides pivot). Dynamic-schema cards honor this; fixed-shape cards may ignore. */
  ignorePaths?: ReadonlyArray<string>;
  /** When true, card surfaces should render an editable variant of the subject (full-bleed editor) rather than a read-only preview. Hosts opt in per-cell — e.g. plugin-board passes editable for in-place editing in grid cells. */
  editable?: boolean;
} & Props;

/** Component props for card role. */
export type CardProps<Subject = unknown, Props extends {} = {}> = CardData<Subject, Props> & {
  role?: string;
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
export const Dialog: Role.Role<DialogData> = Role.make('org.dxos.role.dialog');

/** Role token for the `popover` role. */
export const Popover: Role.Role<DialogData> = Role.make('org.dxos.role.popover');

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
  token: Role.Role<DialogData>,
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
export const Navigation: Role.Role<NavigationData> = Role.make('org.dxos.role.navigation');

/** Role token for the `menuFooter` role (was `menu-footer`). */
export const MenuFooter: Role.Role<MenuFooterData<unknown>> = Role.make('org.dxos.role.menuFooter');

/** Role token for the `navbarEnd` role (was `navbar-end`). */
export const NavbarEnd: Role.Role<NavbarEndData<unknown>> = Role.make('org.dxos.role.navbarEnd');

/** Role token for the `documentTitle` role (was `document-title`). */
export const DocumentTitle: Role.Role<DocumentTitleData<unknown>> = Role.make('org.dxos.role.documentTitle');

/** Role token for the `statusIndicator` role (was `status-indicator`). */
export const StatusIndicator: Role.Role<Record<string, unknown>> = Role.make('org.dxos.role.statusIndicator');

/**
 * Data passed to FormInput surface components by `useInputSurfaceLookup`.
 * Extra fields from `baseData` are accessible as `unknown` via the index signature.
 */
export type FormInputData = {
  prop: string;
  schema: Schema.Schema.AnyNoContext;
  fieldPropertyAst?: SchemaAST.AST;
  [key: string]: unknown;
};

/** Role token for the `formInput` role (was `form-input`). */
export const FormInput: Role.Role<FormInputData> = Role.make('org.dxos.role.formInput');

/** Filter FormInput surfaces by a typed data predicate. */
export const formInput = (predicate: (data: FormInputData) => boolean): Surface.Filter<FormInputData> =>
  Surface.makeFilter(FormInput, predicate);

/** Filter FormInput surfaces by a predicate on the field's AST (`fieldPropertyAst`). */
export const formInputByField = (predicate: (ast: SchemaAST.AST) => boolean): Surface.Filter<FormInputData> =>
  Surface.makeFilter(FormInput, (data) => data.fieldPropertyAst != null && predicate(data.fieldPropertyAst));

/** Filter FormInput surfaces by a predicate on the schema's root AST. */
export const formInputBySchema = (predicate: (ast: SchemaAST.AST) => boolean): Surface.Filter<FormInputData> =>
  Surface.makeFilter(FormInput, (data) => predicate(data.schema.ast));

/** Surface data for navtree-item-end role. */
export type NavtreeItemEndData<Subject = unknown> = {
  id: string;
  subject?: Subject;
  open?: boolean;
};

/** Role token for the `navtreeItemEnd` role (was `navtree-item-end`). */
export const NavtreeItemEnd: Role.Role<NavtreeItemEndData> = Role.make('org.dxos.role.navtreeItemEnd');

/** Role token for the `searchInput` role (was `search-input`). */
export const SearchInput: Role.Role<Record<string, unknown>> = Role.make('org.dxos.role.searchInput');

/**
 * Creates a role token for a deck companion variant. Both the deck consumer
 * (building the `<Surface type={...} />`) and contributing plugins (registering
 * via `Surface.create({ filter: AppSurface.subject(AppSurface.deckCompanion(id), ...) })`)
 * must call this factory with the same variant id so they agree on the dispatch NSID.
 *
 * Variant ids must be camelCase alphanumeric (DXN rule: no hyphens in the final segment).
 */
export const deckCompanion = (variant: string): Role.Role<{ subject?: any }> => {
  if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(variant)) {
    throw new Error(
      `Invalid deck companion variant id: "${variant}". Must be camelCase alphanumeric (no hyphens or underscores).`,
    );
  }
  return Role.make(`org.dxos.role.deckCompanion.${variant}` as any);
};

/** Surface data for navigation role. */
export type NavigationData<Props extends {} = {}> = {
  popoverAnchorId?: string;
  current: string;
} & Props;

/** Component props for navigation role. */
export type NavigationProps<Props extends {} = {}> = NavigationData<Props> & {
  role?: string;
};

/** Surface data for menu-footer role. */
export type MenuFooterData<Subject = unknown, Props extends {} = {}> = {
  subject: Subject;
} & Props;

/** Component props for menu-footer role. */
export type MenuFooterProps<Subject = unknown, Props extends {} = {}> = MenuFooterData<Subject, Props> & {
  role?: string;
};

/** Surface data for navbar-end role. */
export type NavbarEndData<Subject = unknown, Props extends {} = {}> = {
  subject: Subject;
} & Props;

/** Component props for navbar-end role. */
export type NavbarEndProps<Subject = unknown, Props extends {} = {}> = NavbarEndData<Subject, Props> & {
  role?: string;
};

/** Surface data for document-title role. */
export type DocumentTitleData<Subject = unknown, Props extends {} = {}> = {
  subject: Subject;
} & Props;

/** Component props for document-title role. */
export type DocumentTitleProps<Subject = unknown, Props extends {} = {}> = DocumentTitleData<Subject, Props> & {
  role?: string;
};

/**
 * Spy filter: logs the filter's bindings and data to the console.
 */
export const spyFilter = <TData>(label: string, filter: Surface.Filter<TData>): Surface.Filter<TData> => ({
  bindings: filter.bindings.map((binding) => ({
    role: binding.role,
    guard: (data: unknown) => {
      const result = binding.guard(data);
      // Debug-gated and payload-free: this runs on every guard evaluation (hot path) and `data` may
      // carry sensitive entity content.
      log.debug(label, { role: binding.role, result, dataType: data == null ? String(data) : typeof data });
      return result;
    },
  })),
});
