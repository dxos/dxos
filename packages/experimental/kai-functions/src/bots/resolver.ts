//
// Copyright 2023 DXOS.org
//

import { Space } from '@dxos/client/echo';
import { TypedObject } from '@dxos/echo-schema';

/**
 * General data resolver.
 */
export interface Resolver<T extends TypedObject> {
  update(space: Space, object: T): Promise<void>;
}
