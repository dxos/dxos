//
// Copyright 2022 DXOS.org
//

import { Database, Shield, Users } from '@phosphor-icons/react';
import React, { useEffect, useState } from 'react';

import { useMulticastObservable } from '@dxos/react-async';
import { Space, useMembers, SpaceMember } from '@dxos/react-client/echo';

export const SpaceLoading = ({ space }: { space: Space }) => {
  const members = useMembers(space.key);
  const pipelineState = useMulticastObservable(space.pipeline);
  const onlinePeers = members.filter((member) => member.presence === SpaceMember.PresenceState.ONLINE).length;
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    // Delayed visibility.
    setTimeout(() => setVisible(true), 1000);
  }, []);
  if (!visible) {
    return null;
  }

  return (
    <div className='flex absolute right-2 bottom-2 bg-orange-300 rounded px-2 text-sm font-mono items-center space-x-2'>
      <div className='flex items-center'>
        <Shield />
        <span className='flex px-1'>
          {pipelineState.currentControlTimeframe?.totalMessages() ?? 0}/
          {pipelineState.targetControlTimeframe?.totalMessages() ?? 0}
        </span>
      </div>
      <div className='flex items-center'>
        <Database />
        <span className='flex px-1'>
          {pipelineState.currentDataTimeframe?.totalMessages() ?? 0}/
          {pipelineState.targetDataTimeframe?.totalMessages() ?? 0}
        </span>
      </div>
      <div className='flex items-center'>
        <Users />
        <span className='flex px-1'>
          {onlinePeers}/{members.length}
        </span>
      </div>
    </div>
  );
};
