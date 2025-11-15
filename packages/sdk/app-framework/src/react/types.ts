//
// Copyright 2025 DXOS.org
//

import { type Obj } from '@dxos/echo';

/**
 * Base type for surface components.
 */
// TODO(burdon): Standardize PluginSettings and ObjectProperties.
export type SurfaceComponentProps<T extends Obj.Any = Obj.Any, Props = {}> = {
  role?:
    | 'article'
    | 'complementary' // (for companion?)
    | 'section'
    | 'card'
    // Non-standard roles
    | 'card--popover'
    | 'card--intrinsic'
    | 'card--extrinsic'
    | 'card--transclusion';

  /** The object being displayed. */
  subject: T;

  // TODO(burdon): Include attendableId?

  /** Additional properties. */
} & Props;
