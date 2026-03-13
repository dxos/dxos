//
// Copyright 2025 DXOS.org
//

import { type Obj } from '@dxos/echo';

// TODO(burdon): Standardize PluginSettings and ObjectProperties.
// TODO(burdon): companionTo?

export type SurfaceRole =
  | 'item'
  | 'article'
  | 'complementary' // Companion
  | 'section'
  | 'card--content';

/**
 * Base type for surface components.
 */
export type SurfaceComponentProps<Subject extends Obj.Unknown | undefined = Obj.Unknown, Props extends {} = {}> = {
  /** Surface role (superset of WAI-ARIA role). */
  role?: string;

  /** Path-based ID inherited from the surface data for attention tracking and graph action lookup. */
  attendableId?: string;

  /** The primary object being displayed. */
  subject: Subject;
} & Props;
