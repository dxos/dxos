//
// Copyright 2022 DXOS.org
//

import { useMemo } from 'react';

import { Party } from '@dxos/client';
import { SchemaBuilder } from '@dxos/client-testing';

/**
 * @param party
 */
export const useSchemaBuilder = (party?: Party) =>
  useMemo(
    () => (party ? new SchemaBuilder(party.database) : undefined),
    [party?.key.toHex()]
  );
