//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { useDevices, useIdentity } from '@dxos/react-client';
import { JsonTreeView } from '@dxos/react-components';

export const ProfilePanel = () => {
  const profile = useIdentity();
  const devices = useDevices();

  return <JsonTreeView size='medium' data={{ ...profile, devices }} sx={{ marginTop: 1 }} truncateLength={65} />;
};
