//
// Copyright 2025 DXOS.org
//

import { type Obj } from '@dxos/echo';
import { Space } from '@dxos/client/echo';

export type SurfaceRole =
  | 'article'
  | 'card--content'
  | 'complementary' // Companion
  | 'item'
  | 'section';

// TODO(burdon): attendableId => id ("attentable" is the valence)

/**
 * Generic type for surface components that are anchored to a space.
 */
export type SpaceSurfaceProps<Props extends {} = {}> = {
  space?: Space;

  /** Surface role (superset of WAI-ARIA role). */
  role?: string;

  /** Path-based ID inherited from the surface data for attention tracking and graph action lookup. */
  attendableId?: string;
} & Props;

/**
 * Generic type for surface components that have a subject.
 */
export type ObjectSurfaceProps<Subject extends Obj.Unknown | undefined = Obj.Unknown, Props extends {} = {}> = {
  /** Surface role (superset of WAI-ARIA role). */
  role?: string;

  /** Path-based ID inherited from the surface data for attention tracking and graph action lookup. */
  attendableId?: string;

  /** The object this surface is a companion to. */
  companionTo?: Obj.Unknown;

  /** The primary object being displayed. */
  subject: Subject;
} & Props;

/**
 * Generic type for surface companion.
 */
export type CompanionSurfaceProps<
  Subject extends Obj.Unknown | undefined = Obj.Unknown,
  Props extends {} = {},
> = ObjectSurfaceProps<
  Subject,
  {
    /** The object this surface is a companion to. */
    companionTo: Obj.Unknown;
  } & Props
>;

/**
 * Generic type for surface components that are anchored to settings.
 */
export type SettingsSurfaceProps<T extends {}, Props extends {} = {}> = {
  /** Reactive settings. */
  settings: T;

  /** Callback to update settings. */
  onSettingsChange?: (cb: (current: T) => T) => void;
} & Props;
