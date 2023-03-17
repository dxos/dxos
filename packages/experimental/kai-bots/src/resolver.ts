//
// Copyright 2023 DXOS.org
//

import { Space } from '@dxos/client';
import { Document } from '@dxos/echo-schema';

/**
 * General data resolver.
 */
export interface Resolver<T extends Document> {
  update(space: Space, object: T): Promise<void>;
}
