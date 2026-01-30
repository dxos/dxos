//
// Copyright 2025 DXOS.org
//

import { type Obj } from '@dxos/echo';

// TODO(burdon): Define all roles.
export type SurfaceRole =
  | 'item'
  | 'article'
  | 'complementary' // (for companion?)
  | 'section'
  | 'card--content';

/**
 * Base type for surface components.
 */
// TODO(burdon): Standardize PluginSettings and ObjectProperties.
// TODO(burdon): Include attendableId?
// TODO(burdon): companionTo?
export type SurfaceComponentProps<Subject extends Obj.Any = Obj.Any, Role extends string = string> = {
  role?: Role;

  /** The primary object being displayed. */
  subject: Subject;
};
