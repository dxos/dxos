//
// Copyright 2025 DXOS.org
//

import type * as Schema from 'effect/Schema';

import { Plugin } from '@dxos/app-framework';
import { Node } from '@dxos/app-graph';
import { type Space } from '@dxos/client/echo';
import { Obj, Type } from '@dxos/echo';

import { AppCapabilities } from './capabilities';

//
// Prop Types
//

/** Props for components rendering a specific ECHO object subject. Pairs with `object()`. */
export type ObjectProps<Subject extends Obj.Unknown | undefined = Obj.Unknown, Props extends {} = {}> = {
  /** Surface role (superset of WAI-ARIA role). */
  role?: string;

  /** Path-based ID inherited from the surface data for attention tracking and graph action lookup. */
  attendableId?: string;

  /** The object this surface is a companion to. */
  companionTo?: Obj.Unknown;

  /** The primary object being displayed. */
  subject: Subject;
} & Props;

/** Props for attendable subject surfaces (article role). Pairs with `object(schema, { attendable: true })`. */
export type AttendableObjectProps<Subject extends Obj.Unknown | undefined = Obj.Unknown, Props extends {} = {}> =
  ObjectProps<Subject, Props & { attendableId: string }>;

/** Props for settings surfaces. Pairs with `settings()`. */
export type SettingsProps<T extends {}, Props extends {} = {}> = {
  /** Reactive settings. */
  settings: T;

  /** Callback to update settings. */
  onSettingsChange?: (cb: (current: T) => T) => void;
} & Props;

/** Props for companion surfaces. Pairs with `companion()`. */
export type CompanionProps<T extends Obj.Unknown = Obj.Unknown, Props extends {} = {}> = {
  /** Surface role (superset of WAI-ARIA role). */
  role?: string;

  /** Path-based ID inherited from the surface data for attention tracking and graph action lookup. */
  attendableId?: string;

  /** The object this surface is a companion to. */
  companionTo: T;
} & Props;

/** Props for component/dialog-routed surfaces. Pairs with `component()`. */
export type ComponentProps<C extends string = string, P extends {} = {}> = {
  component: C;
  props?: P;
};

/** Props for space-anchored surfaces (no filter pair). */
export type SpaceProps<Props extends {} = {}> = {
  space?: Space;

  /** Surface role (superset of WAI-ARIA role). */
  role?: string;

  /** Path-based ID inherited from the surface data for attention tracking and graph action lookup. */
  attendableId?: string;
} & Props;

/** Props for literal/string constant surfaces. Pairs with `literal()`. */
export type LiteralProps<L extends string | null = string, Props extends {} = {}> = {
  /** Surface role (superset of WAI-ARIA role). */
  role?: string;

  /** The string or null literal identifying this surface. */
  subject: L;
} & Props;

/** Props for graph node surfaces. Pairs with `graphNode()`. */
export type NodeProps<Props extends {} = {}> = {
  /** Surface role (superset of WAI-ARIA role). */
  role?: string;

  /** The graph node being displayed. */
  subject: Node.Node;
} & Props;

/** Props for plugin descriptor surfaces. Pairs with `plugin()`. */
export type PluginProps<Props extends {} = {}> = {
  /** Surface role (superset of WAI-ARIA role). */
  role?: string;

  /** The plugin descriptor. */
  subject: Plugin.Plugin;
} & Props;

/** Props for ECHO schema surfaces. Pairs with `schema()`. */
export type SchemaProps<Props extends {} = {}> = {
  /** Surface role (superset of WAI-ARIA role). */
  role?: string;

  /** The ECHO schema object. */
  subject: Type.AnyEntity;
} & Props;

/** Props for ECHO snapshot surfaces. Pairs with `snapshot()`. */
export type SnapshotProps<T extends Obj.Unknown = Obj.Unknown, Props extends {} = {}> = {
  /** Surface role (superset of WAI-ARIA role). */
  role?: string;

  /** The snapshot of the ECHO object. */
  subject: Obj.Snapshot<T>;
} & Props;

//
// Filter Factories
//

/**
 * Matches when `data.subject` is an instance of the given ECHO schema(s).
 *
 * @example
 * ```ts
 * // Single type.
 * filter: AppSurface.object(Chess.Game)
 *
 * // Union of types.
 * filter: AppSurface.object([Masonry.Masonry, View.View])
 *
 * // Require attendableId.
 * filter: AppSurface.object(Table.Table, { attendable: true })
 * ```
 */
export const object: {
  <S extends Type.AnyEntity>(
    schema: S,
    options?: { attendable?: false },
  ): (data: Record<string, unknown>) => data is { subject: Schema.Schema.Type<S> };
  <S extends Type.AnyEntity>(
    schema: S,
    options: { attendable: true },
  ): (data: Record<string, unknown>) => data is { attendableId: string; subject: Schema.Schema.Type<S> };
  <S extends Type.AnyEntity[]>(
    schemas: [...S],
    options?: { attendable?: false },
  ): (data: Record<string, unknown>) => data is { subject: Schema.Schema.Type<S[number]> };
  <S extends Type.AnyEntity[]>(
    schemas: [...S],
    options: { attendable: true },
  ): (data: Record<string, unknown>) => data is { attendableId: string; subject: Schema.Schema.Type<S[number]> };
} = (schemaOrSchemas: Type.AnyEntity | Type.AnyEntity[], options?: { attendable?: boolean }) => {
  const schemas = Array.isArray(schemaOrSchemas) ? schemaOrSchemas : [schemaOrSchemas];
  return (data: Record<string, unknown>): data is any => {
    if (options?.attendable && typeof data.attendableId !== 'string') {
      return false;
    }
    return schemas.some((schema) => Obj.instanceOf(schema, data.subject));
  };
};

/**
 * Matches when `data.subject` is any ECHO object. Use for fallback surfaces.
 *
 * @example
 * ```ts
 * filter: AppSurface.anyObject()
 * ```
 */
export const anyObject = (): ((data: Record<string, unknown>) => data is { subject: Obj.Unknown }) => {
  return (data: Record<string, unknown>): data is { subject: Obj.Unknown } => Obj.isObject(data.subject);
};

/**
 * Matches when `data.subject` is a plugin settings object with the given prefix.
 *
 * @example
 * ```ts
 * filter: AppSurface.settings(meta.id)
 * ```
 */
export const settings = (
  prefix: string,
): ((data: Record<string, unknown>) => data is { subject: AppCapabilities.Settings }) => {
  return (data: Record<string, unknown>): data is { subject: AppCapabilities.Settings } =>
    AppCapabilities.isSettings(data.subject) && data.subject.prefix === prefix;
};

/**
 * Matches when `data.component` equals the given identifier. Used for dialogs and popovers.
 *
 * @example
 * ```ts
 * filter: AppSurface.component(ASSISTANT_DIALOG)
 * ```
 */
export const component = <C extends string>(
  id: C,
): ((data: Record<string, unknown>) => data is { component: C }) => {
  return (data: Record<string, unknown>): data is { component: C } => data.component === id;
};

/**
 * Matches when `data.companionTo` is an instance of the given schema.
 * With no args, matches any ECHO object as companionTo.
 * Optionally checks `data.subject` against a string literal.
 *
 * @example
 * ```ts
 * // Any ECHO object as companion.
 * filter: AppSurface.companion()
 *
 * // Companion to any Channel.
 * filter: AppSurface.companion(Channel.Channel)
 *
 * // Companion to Channel with subject 'chat'.
 * filter: AppSurface.companion(Channel.Channel, 'chat')
 * ```
 */
export const companion: {
  (): (data: Record<string, unknown>) => data is { companionTo: Obj.Unknown };
  <S extends Type.AnyEntity>(
    schema: S,
  ): (data: Record<string, unknown>) => data is { companionTo: Schema.Schema.Type<S> };
  <S extends Type.AnyEntity, Subj extends string>(
    schema: S,
    subject: Subj,
  ): (data: Record<string, unknown>) => data is { companionTo: Schema.Schema.Type<S>; subject: Subj };
} = (schema?: Type.AnyEntity, subject?: string) => {
  return (data: Record<string, unknown>): data is any => {
    if (schema) {
      if (!Obj.instanceOf(schema, data.companionTo)) {
        return false;
      }
    } else {
      if (!Obj.isObject(data.companionTo)) {
        return false;
      }
    }
    if (subject !== undefined && data.subject !== subject) {
      return false;
    }
    return true;
  };
};

/**
 * Matches when `data.subject` is a string or null literal.
 * Used for companion panes, settings pages, and branch/group nodes.
 *
 * @example
 * ```ts
 * filter: AppSurface.literal('chat')
 * filter: AppSurface.literal(null)
 * ```
 */
export const literal = <L extends string | null>(
  value: L,
): ((data: Record<string, unknown>) => data is { subject: L }) => {
  return (data: Record<string, unknown>): data is { subject: L } => data.subject === value;
};

/**
 * Matches when `data.subject` is a graph node (`Node.Node`).
 *
 * @example
 * ```ts
 * filter: AppSurface.graphNode()
 * ```
 */
export const graphNode = (): ((data: Record<string, unknown>) => data is { subject: Node.Node }) => {
  return (data: Record<string, unknown>): data is { subject: Node.Node } => Node.isGraphNode(data.subject);
};

/**
 * Matches when `data.subject` is a plugin descriptor.
 *
 * @example
 * ```ts
 * filter: AppSurface.plugin()
 * ```
 */
export const plugin = (): ((data: Record<string, unknown>) => data is { subject: Plugin.Plugin }) => {
  return (data: Record<string, unknown>): data is { subject: Plugin.Plugin } => Plugin.isPlugin(data.subject);
};

/**
 * Matches when `data.subject` is an ECHO schema object (e.g., a type created with `Type.object()`).
 *
 * @example
 * ```ts
 * filter: AppSurface.schema()
 * ```
 */
export const schema = (): ((data: Record<string, unknown>) => data is { subject: Type.AnyEntity }) => {
  return (data: Record<string, unknown>): data is { subject: Type.AnyEntity } => {
    const value = data.subject;
    if (value == null) {
      return false;
    }
    const candidate = value as Type.AnyEntity;
    return Type.isObjectSchema(candidate) || Type.isRelationSchema(candidate);
  };
};

/**
 * Matches when `data.subject` is a snapshot of the given ECHO schema.
 *
 * @example
 * ```ts
 * filter: AppSurface.snapshot(Thread.Thread)
 * ```
 */
export const snapshot = <S extends Type.AnyEntity>(
  schema: S,
): ((data: Record<string, unknown>) => data is { subject: Obj.Snapshot<Schema.Schema.Type<S>> }) => {
  return (data: Record<string, unknown>): data is { subject: Obj.Snapshot<Schema.Schema.Type<S>> } =>
    Obj.snapshotOf(schema, data.subject);
};

/**
 * Combines two filters with intersection types. Both must match.
 *
 * @example
 * ```ts
 * // Object subject + typed companion.
 * filter: AppSurface.and(
 *   AppSurface.object(Message.Message, { attendable: true }),
 *   AppSurface.companion(Mailbox.Mailbox),
 * )
 *
 * // Literal subject + any companion.
 * filter: AppSurface.and(
 *   AppSurface.literal('comments'),
 *   AppSurface.companion(),
 * )
 * ```
 */
export const and = <A extends Record<string, any>, B extends Record<string, any>>(
  a: (data: Record<string, unknown>) => data is A,
  b: (data: Record<string, unknown>) => data is B,
): ((data: Record<string, unknown>) => data is A & B) => {
  return (data: Record<string, unknown>): data is A & B => a(data) && b(data);
};
