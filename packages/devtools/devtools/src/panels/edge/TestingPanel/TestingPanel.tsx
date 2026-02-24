//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { waitForCondition } from '@dxos/async';
import { type Space, type SpaceId } from '@dxos/client/echo';
import { DeviceType } from '@dxos/client/halo';
import { log } from '@dxos/log';
import { useClient } from '@dxos/react-client';
import { IconButton, Toolbar } from '@dxos/react-ui';

import { PanelContainer } from '../../../components';
import { DataSpaceSelector } from '../../../containers';
import { useDevtoolsDispatch, useDevtoolsState } from '../../../hooks';
import { SyncStateInfo } from '../../echo';

export type TestingPanelProps = {
  onSpaceCreate?: (space: Space) => Promise<void>;
  onScriptPluginOpen?: (space: Space) => Promise<void>;
};

export const TestingPanel = ({ onSpaceCreate, onScriptPluginOpen }: TestingPanelProps) => {
  const client = useClient();
  const { space } = useDevtoolsState();
  const dispatch = useDevtoolsDispatch();

  const handleSpaceCreate = async () => {
    const agentDevice = client.halo.devices.get().find((device) => device.profile?.type === DeviceType.AGENT_MANAGED);
    const agentKey = agentDevice?.deviceKey.toHex();
    if (!agentKey) {
      log.warn('no agent key');
      return;
    }

    try {
      const response = await client.edge.createSpace({ agentKey });
      log.info('space created', { response });
      const space = await waitForCondition({
        condition: () => client.spaces.get(response.spaceId as SpaceId),
        timeout: 10000,
        interval: 100,
      });
      if (!space) {
        log.warn('space not found', { spaceId: response.spaceId });
        return;
      }

      await onSpaceCreate?.(space);
      dispatch((state) => ({ ...state, space }));
    } catch (error) {
      log.warn('space creation failed', { error });
    }
  };

  const handleScriptPluginOpen = async () => {
    if (!space) {
      log.warn('no space');
      return;
    }
    await onScriptPluginOpen?.(space);
  };

  return (
    <PanelContainer
      classNames='flex flex-col gap-4 p-4'
      toolbar={
        <Toolbar.Root>
          <DataSpaceSelector />
          <Toolbar.IconButton icon='ph--plus--regular' label='Create Space' onClick={handleSpaceCreate} />
        </Toolbar.Root>
      }
    >
      <IconButton icon='ph--code--regular' label='Open Script Plugin' onClick={handleScriptPluginOpen} />
      <div className='border-t border-separator'>{space && <SyncStateInfo space={space} />}</div>
    </PanelContainer>
  );
};
