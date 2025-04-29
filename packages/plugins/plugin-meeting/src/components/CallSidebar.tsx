//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { useCapability } from '@dxos/app-framework';

import { CallContainer } from './CallContainer';
import { MeetingCapabilities } from '../capabilities';

export const CallSidebar = () => {
  const call = useCapability(MeetingCapabilities.CallManager);
  return <CallContainer roomId={call.roomId} />;
};

export default CallSidebar;
