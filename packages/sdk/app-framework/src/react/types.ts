//
// Copyright 2025 DXOS.org
//

import { type Obj } from '@dxos/echo';

// TODO(burdon): PluginSettings, ObjectSettings.
// TODO(burdon): Base class for surface components.

export type ArticleComponentProps<T extends Obj.Any = Obj.Any> = {
  object: T;
};

export type SectionComponentProps<T extends Obj.Any = Obj.Any> = {
  object: T;
};

// export type CompanionComponentProps<T extends Obj.Any = Obj.Any> = {
//   object: T;
// };

// export type CardComponentProps<T extends Obj.Any = Obj.Any> = {
//   object: T;
// };
