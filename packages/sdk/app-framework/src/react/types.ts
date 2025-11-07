//
// Copyright 2025 DXOS.org
//

import { type Obj } from '@dxos/echo';

// TODO(burdon): PluginSettings, ObjectSettings.
// TODO(burdon): Base class for surface components.

export type SurfaceComponentProps<T extends Obj.Any = Obj.Any> = {
  role?: 'article' | 'section' | 'card';
  object: T;
};
