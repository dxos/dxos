//
// Copyright 2025 DXOS.org
//

import React, { useState } from 'react';

import { waitForCondition } from '@dxos/async';
import { type SpaceId, type Space } from '@dxos/client/echo';
import { DeviceType } from '@dxos/client/halo';
import { log } from '@dxos/log';
import { useClient } from '@dxos/react-client';
import { Icon, IconButton } from '@dxos/react-ui';

import { PanelContainer } from '../../../components';

enum CreationState {
  IDLE = 'idle',
  PENDING = 'pending',
  SUCCESS = 'success',
  ERROR = 'error',
}

export const TestingPanel = ({
  onSpaceCreate,
  onScriptPluginOpen,
}: {
  onSpaceCreate?: (space: Space) => Promise<void>;
  onScriptPluginOpen?: (space: Space) => Promise<void>;
}) => {
  const client = useClient();
  // TODO(mykola): Use ToolbarMenu from @dxos/react-ui-menu.
  const [createState, setCreateState] = useState<CreationState>(CreationState.IDLE);
  const [lastSpace, setLastSpace] = useState<Space>();

  const handleSpaceCreate = async () => {
    setCreateState(CreationState.PENDING);
    const agentDevice = client.halo.devices.get().find((device) => device.profile?.type === DeviceType.AGENT_MANAGED);
    const agentKey = agentDevice?.deviceKey.toHex();
    if (!agentKey) {
      setCreateState(CreationState.ERROR);
      log.warn('no agent key');
      return;
    }

    try {
      const response = await client.edge.createSpace({ agentKey });
      log.info('space created', { response });
      setCreateState(CreationState.SUCCESS);
      const space = await waitForCondition({
        condition: () => client.spaces.get(response.spaceId as SpaceId),
        timeout: 10000,
        interval: 100,
      });
      if (!space) {
        log.warn('space not found', { spaceId: response.spaceId });
        return;
      }
      setLastSpace(space);
      await onSpaceCreate?.(space);
    } catch (error) {
      setCreateState(CreationState.ERROR);
      log.warn('space creation failed', { error });
    }
  };

  const handleScriptPluginOpen = async () => {
    if (!lastSpace) {
      log.warn('no space');
      return;
    }
    await onScriptPluginOpen?.(lastSpace);
  };

  return (
    <PanelContainer classNames='flex flex-col gap-4 p-4'>
      <div className='flex flex-row items-center gap-3'>
        <IconButton
          disabled={createState === CreationState.PENDING}
          icon='ph--plus'
          label='Create Space'
          onClick={handleSpaceCreate}
        />
        {createState === CreationState.PENDING && <Icon icon='ph--spinner-gap--regular' classNames='animate-spin' />}
        {createState === CreationState.SUCCESS && <Icon icon='ph--check--regular' />}
        {createState === CreationState.ERROR && <Icon icon='ph--warning-circle--regular' />}
      </div>

      <IconButton icon='ph--code--regular' label='Open Script Plugin' onClick={handleScriptPluginOpen} />
    </PanelContainer>
  );
};
