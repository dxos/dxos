//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { useCapability } from '@dxos/app-framework';

import { ChannelContainer } from './ChannelContainer';
import { ThreadCapabilities } from '../capabilities';

export const CallSidebar = () => {
  const call = useCapability(ThreadCapabilities.CallManager);
  return <ChannelContainer roomId={call.roomId} />;
};

export default CallSidebar;
