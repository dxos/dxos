//
// Copyright 2024 DXOS.org
//

import { useAtomValue } from '@effect-atom/atom-react';
import React from 'react';

import { useCapability } from '@dxos/app-framework/ui';

import { ThreadCapabilities } from '../types';

import { ChannelContainer } from './ChannelContainer';

export const CallSidebar = () => {
  const call = useCapability(ThreadCapabilities.CallManager);
  const roomId = useAtomValue(call.roomIdAtom);
  return <ChannelContainer subject={undefined} roomId={roomId} />;
};

export default CallSidebar;
