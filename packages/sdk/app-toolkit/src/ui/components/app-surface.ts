//
// Copyright 2025 DXOS.org
//

import type * as Schema from 'effect/Schema';

import { Plugin } from '@dxos/app-framework';
import { Node } from '@dxos/app-graph';
import { Obj, Type } from '@dxos/echo';

import { AppCapabilities } from '../../capabilities';

//
// Combinators
//

/** Combines two filters with intersection types. Both must match. */
export const and = <Left extends Record<string, any>, Right extends Record<string, any>>(
  left: (data: Record<string, unknown>) => data is Left,
  right: (data: Record<string, unknown>) => data is Right,
): ((data: Record<string, unknown>) => data is Left & Right) => {
  return (data: Record<string, unknown>): data is Left & Right => left(data) && right(data);
};

//
// Article
//

/** Surface data for article role (from PlankComponent). */
export type ArticleData<Subject = unknown, Props extends {} = {}, CompanionTo = unknown> = {
  attendableId: string;
  subject: Subject;
  properties?: Record<string, any>;
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

/** Filter: article-role ECHO object. */
export const objectArticle: {
  <S extends Type.AnyEntity>(
    schema: S,
  ): (data: Record<string, unknown>) => data is ObjectArticleData<Schema.Schema.Type<S>>;
  <S extends Type.AnyEntity[]>(
    schemas: [...S],
  ): (data: Record<string, unknown>) => data is ObjectArticleData<Schema.Schema.Type<S[number]>>;
} = (schemaOrSchemas: Type.AnyEntity | Type.AnyEntity[]) => {
  const schemas = Array.isArray(schemaOrSchemas) ? schemaOrSchemas : [schemaOrSchemas];
  return (data: Record<string, unknown>): data is any => {
    if (typeof data.attendableId !== 'string') {
      return false;
    }
    return schemas.some((schema) => Obj.instanceOf(schema, data.subject));
  };
};

/** Filter: article-role literal subject. */
export const literalArticle = <T extends string | null>(
  value: T,
): ((data: Record<string, unknown>) => data is ArticleData<T>) => {
  return (data: Record<string, unknown>): data is ArticleData<T> => {
    return typeof data.attendableId === 'string' && data.subject === value;
  };
};

/** Filter: article-role companionTo check. Composable via `and()`. */
export const companionArticle: {
  (): (data: Record<string, unknown>) => data is { companionTo: Obj.Unknown };
  <S extends Type.AnyEntity>(
    schema: S,
  ): (data: Record<string, unknown>) => data is { companionTo: Schema.Schema.Type<S> };
  <T extends string>(value: T): (data: Record<string, unknown>) => data is { companionTo: T };
} = (schemaOrValue?: Type.AnyEntity | string) => {
  return (data: Record<string, unknown>): data is any => {
    if (schemaOrValue === undefined) {
      return Obj.isObject(data.companionTo);
    }
    if (typeof schemaOrValue === 'string') {
      return data.companionTo === schemaOrValue;
    }
    return Obj.instanceOf(schemaOrValue, data.companionTo);
  };
};

/** Component props for article-role plugin settings. */
export type SettingsArticleProps<T extends {}, Props extends {} = {}> = {
  settings: T;
  onSettingsChange?: (cb: (current: T) => T) => void;
} & Props;

/** Filter: article-role plugin settings with prefix. */
export const settingsArticle = (
  prefix: string,
): ((data: Record<string, unknown>) => data is { subject: AppCapabilities.Settings }) => {
  return (data: Record<string, unknown>): data is { subject: AppCapabilities.Settings } =>
    AppCapabilities.isSettings(data.subject) && data.subject.prefix === prefix;
};

//
// Section
//

/** Surface data for section role (from StackSection). */
export type SectionData<Subject = unknown, Props extends {} = {}> = {
  attendableId?: string;
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

/** Filter: section-role ECHO object. */
export const objectSection: {
  <S extends Type.AnyEntity>(
    schema: S,
  ): (data: Record<string, unknown>) => data is ObjectSectionData<Schema.Schema.Type<S>>;
  <S extends Type.AnyEntity[]>(
    schemas: [...S],
  ): (data: Record<string, unknown>) => data is ObjectSectionData<Schema.Schema.Type<S[number]>>;
} = (schemaOrSchemas: Type.AnyEntity | Type.AnyEntity[]) => {
  const schemas = Array.isArray(schemaOrSchemas) ? schemaOrSchemas : [schemaOrSchemas];
  return (data: Record<string, unknown>): data is any => {
    return schemas.some((schema) => Obj.instanceOf(schema, data.subject));
  };
};

/** Surface data for object-settings surfaces. */
export type ObjectSettingsData<
  Subject extends Obj.Unknown | undefined = Obj.Unknown,
  Props extends {} = {},
> = SectionData<Subject, Props>;

/** Component props for object-settings surfaces. */
export type ObjectSettingsProps<
  Subject extends Obj.Unknown | undefined = Obj.Unknown,
  Props extends {} = {},
> = SectionProps<Subject, Props>;

/** Filter: object-settings-role ECHO object. */
export const objectSettings: {
  <S extends Type.AnyEntity>(
    schema: S,
  ): (data: Record<string, unknown>) => data is ObjectSettingsData<Schema.Schema.Type<S>>;
} = (schema: Type.AnyEntity) => {
  return (data: Record<string, unknown>): data is any => {
    return Obj.instanceOf(schema, data.subject);
  };
};

/** Surface data for section-role literal. */
export type TSectionData<T extends string | null = string, Props extends {} = {}> = SectionData<T, Props>;

/** Component props for section-role literal. */
export type TSectionProps<T extends string | null = string, Props extends {} = {}> = SectionProps<T, Props>;

/** Filter: section-role literal string/null subject. */
export const literalSection = <T extends string | null>(
  value: T,
): ((data: Record<string, unknown>) => data is TSectionData<T>) => {
  return (data: Record<string, unknown>): data is TSectionData<T> => data.subject === value;
};

/** Surface data for section-role any ECHO object (fallback). */
export type AnyObjectSectionData<Props extends {} = {}> = SectionData<Obj.Unknown, Props>;

/** Component props for section-role any ECHO object (fallback). */
export type AnyObjectSectionProps<Props extends {} = {}> = SectionProps<Obj.Unknown, Props>;

/** Filter: section-role any ECHO object (fallback). */
export const anyObjectSection = (): ((data: Record<string, unknown>) => data is AnyObjectSectionData) => {
  return (data: Record<string, unknown>): data is AnyObjectSectionData => Obj.isObject(data.subject);
};

/** Surface data for section-role graph node. */
export type NodeSectionData<Props extends {} = {}> = SectionData<Node.Node, Props>;

/** Component props for section-role graph node. */
export type NodeSectionProps<Props extends {} = {}> = SectionProps<Node.Node, Props>;

/** Filter: section-role graph node subject. */
export const graphNodeSection = (): ((data: Record<string, unknown>) => data is NodeSectionData) => {
  return (data: Record<string, unknown>): data is NodeSectionData => Node.isGraphNode(data.subject);
};

/** Surface data for section-role plugin descriptor. */
export type PluginSectionData<Props extends {} = {}> = SectionData<Plugin.Plugin, Props>;

/** Component props for section-role plugin descriptor. */
export type PluginSectionProps<Props extends {} = {}> = SectionProps<Plugin.Plugin, Props>;

/** Filter: section-role plugin descriptor subject. */
export const pluginSection = (): ((data: Record<string, unknown>) => data is PluginSectionData) => {
  return (data: Record<string, unknown>): data is PluginSectionData => Plugin.isPlugin(data.subject);
};

/** Surface data for section-role ECHO schema. */
export type SchemaSectionData<Props extends {} = {}> = SectionData<Type.AnyEntity, Props>;

/** Component props for section-role ECHO schema. */
export type SchemaSectionProps<Props extends {} = {}> = SectionProps<Type.AnyEntity, Props>;

/** Filter: section-role ECHO schema subject. */
export const schemaSection = (): ((data: Record<string, unknown>) => data is SchemaSectionData) => {
  return (data: Record<string, unknown>): data is SchemaSectionData => {
    const value = data.subject;
    if (value == null) {
      return false;
    }
    const candidate = value as Type.AnyEntity;
    return Type.isObjectSchema(candidate) || Type.isRelationSchema(candidate);
  };
};

/** Surface data for section-role ECHO snapshot. */
export type SnapshotSectionData<T extends Obj.Unknown = Obj.Unknown, Props extends {} = {}> = SectionData<
  Obj.Snapshot<T>,
  Props
>;

/** Component props for section-role ECHO snapshot. */
export type SnapshotSectionProps<T extends Obj.Unknown = Obj.Unknown, Props extends {} = {}> = SectionProps<
  Obj.Snapshot<T>,
  Props
>;

/** Filter: section-role ECHO snapshot subject. */
export const snapshotSection = <S extends Type.AnyEntity>(
  schema: S,
): ((data: Record<string, unknown>) => data is SnapshotSectionData<Schema.Schema.Type<S>>) => {
  return (data: Record<string, unknown>): data is SnapshotSectionData<Schema.Schema.Type<S>> =>
    Obj.snapshotOf(schema, data.subject);
};

//
// Card
//

/** Surface data for card role. */
export type CardData<Subject = unknown, Props extends {} = {}> = {
  subject: Subject;
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

/** Filter: card-role ECHO object. */
export const objectCard: {
  <S extends Type.AnyEntity>(
    schema: S,
  ): (data: Record<string, unknown>) => data is ObjectCardData<Schema.Schema.Type<S>>;
  <S extends Type.AnyEntity[]>(
    schemas: [...S],
  ): (data: Record<string, unknown>) => data is ObjectCardData<Schema.Schema.Type<S[number]>>;
} = (schemaOrSchemas: Type.AnyEntity | Type.AnyEntity[]) => {
  const schemas = Array.isArray(schemaOrSchemas) ? schemaOrSchemas : [schemaOrSchemas];
  return (data: Record<string, unknown>): data is any => {
    return schemas.some((schema) => Obj.instanceOf(schema, data.subject));
  };
};

//
// Dialog / Popover
//

/** Surface data for dialog/popover role. */
export type DialogData<Component extends string = string, ComponentProps extends {} = {}> = {
  component: Component;
  props?: ComponentProps;
};

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

/** Filter: dialog/popover component routing. */
export const componentDialog = <Component extends string>(
  id: Component,
): ((data: Record<string, unknown>) => data is DialogData<Component>) => {
  return (data: Record<string, unknown>): data is DialogData<Component> => data.component === id;
};

//
// Chrome
//

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
