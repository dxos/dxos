//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { useDevices, useIdentity } from '@dxos/react-client';
import { JsonTreeView } from '@dxos/react-components-deprecated';

// TODO(burdon): Implement table.
export const IdentityPanel = () => {
  const identity = useIdentity();
  const devices = useDevices();

  return <JsonTreeView size='small' data={{ ...identity, devices }} sx={{ marginTop: 1 }} truncateLength={65} />;
};
