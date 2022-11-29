//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { useIdentity } from '@dxos/react-client';
import { JsonTreeView } from '@dxos/react-components';

export const ProfilePanel = () => {
  const profile = useIdentity();

  return <JsonTreeView size='medium' data={profile} sx={{ marginTop: 1 }} truncateLength={65} />;
};
