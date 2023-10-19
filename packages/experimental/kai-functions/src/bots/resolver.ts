//
// Copyright 2023 DXOS.org
//

import { type Space } from '@dxos/client/echo';
import { type TypedObject } from '@dxos/echo-schema';

/**
 * General data resolver.
 */
export interface Resolver<T extends TypedObject> {
  update(space: Space, object: T): Promise<void>;
}
