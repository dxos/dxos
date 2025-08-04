//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { useCapability } from '@dxos/app-framework';

import { ThreadCapabilities } from '../capabilities';

import { ChannelContainer } from './ChannelContainer';

export const CallSidebar = () => {
  const call = useCapability(ThreadCapabilities.CallManager);
  return <ChannelContainer roomId={call.roomId} />;
};

export default CallSidebar;
