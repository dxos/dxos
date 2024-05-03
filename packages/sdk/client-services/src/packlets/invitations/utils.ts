//
// Copyright 2024 DXOS.org
//

import { Invitation } from '@dxos/protocols/proto/dxos/client/services';

export const stateToString = (state: Invitation.State): string => {
  return Object.entries(Invitation.State).find(([key, val]) => val === state)?.[0] ?? 'unknown';
};
