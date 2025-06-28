//
// Copyright 2025 DXOS.org
//

import { useMemo } from 'react';

import { fullyQualifiedId, type Live } from '@dxos/client/echo';

/**
 * Returns a stable fully qualified id for a reactive object.
 */
export const useObjectId = (object: Live<any>) => {
  return useMemo(() => fullyQualifiedId(object), [object]);
};
