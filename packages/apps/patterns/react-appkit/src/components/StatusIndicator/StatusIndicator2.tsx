//
// Copyright 2022 DXOS.org
//

import React from 'react';
import { useStatus } from '@dxos/react-client';
import { Indicator } from './Indicator';

// TODO(burdon): Extend to show heartbeat, network status, etc.
// TODO(burdon): Merge with ErrorBoundary indicator since overlaps.
export const StatusIndicator2 = () => {
  const status = useStatus();
  return <Indicator status={status} />;
};
