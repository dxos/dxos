//
// Copyright 2025 DXOS.org
//

import { type Obj } from '@dxos/echo';
import { Space } from '@dxos/client/echo';

// TODO(burdon): attendableId => id ("attentable" is the valence)

export type SurfaceRole =
  | 'item'
  | 'article'
  | 'complementary' // Companion
  | 'section'
  | 'card--content';

/**
 * Generic type for surface components that are anchored to a space.
 */
export type SpaceSurfaceProps = {
  space?: Space;

  /** Surface role (superset of WAI-ARIA role). */
  role?: string;

  /** Path-based ID inherited from the surface data for attention tracking and graph action lookup. */
  attendableId?: string;
};

/**
 * Generic type for surface components that have a subject.
 * NOTE: These properties are passed from `Plank`.
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
 * Generic type for surface components that are anchored to settings.
 */
export type SettingsSurfaceProps<T extends {}> = {
  settings: T;
  onSettingsChange?: (cb: (current: T) => T) => void;
};
