//
// Copyright 2025 DXOS.org
//

import type * as Schema from 'effect/Schema';

import { Plugin } from '@dxos/app-framework';
import { Node } from '@dxos/app-graph';
import { type Space } from '@dxos/client/echo';
import { Obj, Type } from '@dxos/echo';

import { AppCapabilities } from './capabilities';

/**
 * Surface filter factories and paired component prop types for the Composer ontology.
 *
 * Each filter factory has a corresponding prop type for the component it matches:
 * - `AppSurface.object()` pairs with `AppSurface.ObjectProps`
 * - `AppSurface.settings()` pairs with `AppSurface.SettingsProps`
 * - `AppSurface.companion()` pairs with `AppSurface.CompanionProps`
 * - `AppSurface.component()` pairs with `AppSurface.ComponentProps`
 */
// eslint-disable-next-line @stayradiated/prefer-arrow-functions/prefer-arrow-functions
export namespace AppSurface {
  //
  // Prop Types
  //

  /** Role union for common surface roles. */
  export type Role = 'article' | 'card--content' | 'complementary' | 'item' | 'section';

  /** Props for components rendering a specific ECHO object subject. Pairs with `subject()`. */
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

  /** Props for attendable subject surfaces (article role). Pairs with `subject(schema, { attendable: true })`. */
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
  export function object<S extends Type.AnyEntity>(
    schema: S,
    options?: { attendable?: false },
  ): (data: Record<string, unknown>) => data is { subject: Schema.Schema.Type<S> };
  export function object<S extends Type.AnyEntity>(
    schema: S,
    options: { attendable: true },
  ): (data: Record<string, unknown>) => data is { attendableId: string; subject: Schema.Schema.Type<S> };
  export function object<S extends Type.AnyEntity[]>(
    schemas: [...S],
    options?: { attendable?: false },
  ): (data: Record<string, unknown>) => data is { subject: Schema.Schema.Type<S[number]> };
  export function object<S extends Type.AnyEntity[]>(
    schemas: [...S],
    options: { attendable: true },
  ): (data: Record<string, unknown>) => data is { attendableId: string; subject: Schema.Schema.Type<S[number]> };
  export function object(
    schemaOrSchemas: Type.AnyEntity | Type.AnyEntity[],
    options?: { attendable?: boolean },
  ): (data: Record<string, unknown>) => data is any {
    const schemas = Array.isArray(schemaOrSchemas) ? schemaOrSchemas : [schemaOrSchemas];
    return (data: Record<string, unknown>): data is any => {
      if (options?.attendable && typeof data.attendableId !== 'string') {
        return false;
      }
      return schemas.some((schema) => Obj.instanceOf(schema, data.subject));
    };
  }

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
   * Optionally checks `data.subject` against a string literal.
   *
   * @example
   * ```ts
   * // Companion to any Channel.
   * filter: AppSurface.companion(Channel.Channel)
   *
   * // Companion to Channel with subject 'chat'.
   * filter: AppSurface.companion(Channel.Channel, 'chat')
   * ```
   */
  export function companion<S extends Type.AnyEntity, Subj extends string>(
    schema: S,
    subject: Subj,
  ): (data: Record<string, unknown>) => data is { companionTo: Schema.Schema.Type<S>; subject: Subj };
  export function companion<S extends Type.AnyEntity>(
    schema: S,
  ): (data: Record<string, unknown>) => data is { companionTo: Schema.Schema.Type<S> };
  export function companion(
    schema: Type.AnyEntity,
    subject?: string,
  ): (data: Record<string, unknown>) => data is any {
    return (data: Record<string, unknown>): data is any => {
      if (!Obj.instanceOf(schema, data.companionTo)) {
        return false;
      }
      if (subject !== undefined && data.subject !== subject) {
        return false;
      }
      return true;
    };
  }

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
}
