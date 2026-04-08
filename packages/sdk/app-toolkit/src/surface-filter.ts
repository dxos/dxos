//
// Copyright 2025 DXOS.org
//

import type * as Schema from 'effect/Schema';

import { type Space } from '@dxos/client/echo';
import { Obj, type Type } from '@dxos/echo';

import { AppCapabilities } from './capabilities';

/**
 * Surface filter factories and paired component prop types for the Composer ontology.
 *
 * Each filter factory has a corresponding prop type for the component it matches:
 * - `AppSurface.subject()` pairs with `AppSurface.SubjectProps`
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
  export type SubjectProps<Subject extends Obj.Unknown | undefined = Obj.Unknown, Props extends {} = {}> = {
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
  export type AttendableSubjectProps<Subject extends Obj.Unknown | undefined = Obj.Unknown, Props extends {} = {}> =
    SubjectProps<Subject, Props & { attendableId: string }>;

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

  //
  // Filter Factories
  //

  /**
   * Matches when `data.subject` is an instance of the given ECHO schema(s).
   *
   * @example
   * ```ts
   * // Single type.
   * filter: AppSurface.subject(Chess.Game)
   *
   * // Union of types.
   * filter: AppSurface.subject([Masonry.Masonry, View.View])
   *
   * // Require attendableId.
   * filter: AppSurface.subject(Table.Table, { attendable: true })
   * ```
   */
  export function subject<S extends Type.AnyEntity>(
    schema: S,
    options?: { attendable?: false },
  ): (data: Record<string, unknown>) => data is { subject: Schema.Schema.Type<S> };
  export function subject<S extends Type.AnyEntity>(
    schema: S,
    options: { attendable: true },
  ): (data: Record<string, unknown>) => data is { attendableId: string; subject: Schema.Schema.Type<S> };
  export function subject<S extends Type.AnyEntity[]>(
    schemas: [...S],
    options?: { attendable?: false },
  ): (data: Record<string, unknown>) => data is { subject: Schema.Schema.Type<S[number]> };
  export function subject<S extends Type.AnyEntity[]>(
    schemas: [...S],
    options: { attendable: true },
  ): (data: Record<string, unknown>) => data is { attendableId: string; subject: Schema.Schema.Type<S[number]> };
  export function subject(
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
}
