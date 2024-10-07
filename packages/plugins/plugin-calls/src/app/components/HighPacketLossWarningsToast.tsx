//
// Copyright 2024 DXOS.org
//

import React, { useMemo } from 'react';

import { Icon } from './Icon/Icon';
import Toast, { Root } from '../components/Toast';
import { useSubscribedState } from '../hooks/rxjsHooks';
import { useConditionForAtLeast } from '../hooks/useConditionForAtLeast';
import { useRoomContext } from '../hooks/useRoomContext';
import { getPacketLossStats$ } from '../utils/rxjs/getPacketLossStats$';

const useStats = () => {
  const { peer } = useRoomContext();
  const stats$ = useMemo(() => getPacketLossStats$(peer.peerConnection$), [peer.peerConnection$]);
  const stats = useSubscribedState(stats$, {
    inboundPacketLossPercentage: 0,
    outboundPacketLossPercentage: 0,
  });

  return stats;
};

export const HighPacketLossWarningsToast = () => {
  const { inboundPacketLossPercentage, outboundPacketLossPercentage } = useStats();

  const hasIssues = useConditionForAtLeast(
    inboundPacketLossPercentage !== undefined &&
      outboundPacketLossPercentage !== undefined &&
      (inboundPacketLossPercentage > 0.05 || outboundPacketLossPercentage > 0.05),
    5000,
  );

  if (inboundPacketLossPercentage === undefined || outboundPacketLossPercentage === undefined) {
    return null;
  }

  if (!hasIssues) {
    return null;
  }

  return (
    <Root duration={Infinity}>
      <div className='space-y-2 text-sm'>
        <div className='font-bold'>
          <Toast.Title className='flex items-center gap-2'>
            <Icon type='SignalSlashIcon' />
            Unstable connection
          </Toast.Title>
        </div>
        <Toast.Description>Call quality may be affected.</Toast.Description>
      </div>
    </Root>
  );
};
