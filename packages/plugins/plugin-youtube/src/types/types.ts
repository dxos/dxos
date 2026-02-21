//
// Copyright 2024 DXOS.org
//

import { defineOperation } from '@dxos/operation';

/**
 * YouTube plugin operations.
 */
export const YouTubeOperation = {
  OnCreateSpace: defineOperation<{ spaceId: string }>(),
};
