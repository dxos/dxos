//
// Copyright 2020 DXOS.org
//

import { useMemo } from 'react';

import { Party } from '@dxos/echo-db';

import { useResultSet } from '../util';

/**
 * Get all known members of a Party.
 */
export const usePartyMembers = (party: Party) => {
  return useResultSet(useMemo(() => party.queryMembers(), [party.key.toHex()]));
};
