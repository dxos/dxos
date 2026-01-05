//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { type Obj } from '@dxos/echo';

export const SurfaceCardRole = Schema.Literal(
  'card',
  'card--popover',
  'card--intrinsic',
  'card--extrinsic',
  'card--transclusion',
);

export type SurfaceCardRole = Schema.Schema.Type<typeof SurfaceCardRole>;

// TODO(burdon): Define all roles.
export type SurfaceRole =
  | 'item'
  | 'article'
  | 'complementary' // (for companion?)
  | 'section'
  | SurfaceCardRole;

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
