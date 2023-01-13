//
// Copyright 2022 DXOS.org
//

import { useMemo } from 'react';

import { Space } from '@dxos/client';
import { SchemaBuilder } from '@dxos/client-testing';

/**
 * @param space
 */
export const useSchemaBuilder = (space?: Space) =>
  useMemo(() => (space ? new SchemaBuilder(space.database) : undefined), [space?.key.toHex()]);
