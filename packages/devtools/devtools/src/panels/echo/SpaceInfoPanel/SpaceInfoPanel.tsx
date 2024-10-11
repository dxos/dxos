//
// Copyright 2020 DXOS.org
//

import { ArrowClockwise } from '@phosphor-icons/react';
import React, { type FC, useState } from 'react';

import { MulticastObservable } from '@dxos/async';
import { SpaceState } from '@dxos/protocols/proto/dxos/client/services';
import { EdgeReplicationSetting } from '@dxos/protocols/proto/dxos/echo/metadata';
import { useMulticastObservable } from '@dxos/react-hooks';
import { Toolbar } from '@dxos/react-ui';
import { getSize } from '@dxos/react-ui-theme';

import { FeedTable } from './FeedTable';
import { PipelineTable } from './PipelineTable';
import { SpaceProperties } from './SpaceProperties';
import { SyncStateInfo } from './SyncStateInfo';
import { PanelContainer } from '../../../components';
import { DataSpaceSelector } from '../../../containers';
import { useDevtoolsState, useSpacesInfo } from '../../../hooks';

export const SpaceInfoPanel: FC = () => {
  const [, forceUpdate] = useState({});
  const { space } = useDevtoolsState();

  // TODO(dmaretskyi): We don't need SpaceInfo anymore?
  const spacesInfo = useSpacesInfo();
  const metadata = space?.key && spacesInfo.find((info) => info.key.equals(space?.key));
  const pipelineState = useMulticastObservable(space?.pipeline ?? MulticastObservable.empty());

  const toggleActive = async () => {
    const state = space!.state.get();
    if (state === SpaceState.SPACE_INACTIVE) {
      await space!.open();
    } else {
      await space!.close();
    }
  };

  const toggleEdgeReplication = async () => {
    await space?.internal.setEdgeReplicationPreference(
      space?.internal.data.edgeReplication === EdgeReplicationSetting.ENABLED
        ? EdgeReplicationSetting.DISABLED
        : EdgeReplicationSetting.ENABLED,
    );
    setTimeout(() => forceUpdate({}), 500); // Refresh the panel.
  };

  return (
    <PanelContainer
      toolbar={
        <Toolbar.Root>
          <DataSpaceSelector />
          <Toolbar.Button onClick={() => forceUpdate({})}>
            <ArrowClockwise className={getSize(5)} />
          </Toolbar.Button>
          <div className='grow' />
          <Toolbar.Button onClick={toggleActive}>
            {space?.state.get() === SpaceState.SPACE_INACTIVE ? 'Open' : 'Close'}
          </Toolbar.Button>
          <Toolbar.Button onClick={toggleEdgeReplication}>
            {space?.internal.data.edgeReplication === EdgeReplicationSetting.ENABLED
              ? 'Disable backup to EDGE'
              : 'Enable backup to EDGE'}
          </Toolbar.Button>
        </Toolbar.Root>
      }
    >
      {space && metadata && (
        <div className='flex flex-col gap-4'>
          <SpaceProperties space={space} metadata={metadata} />
          <PipelineTable state={pipelineState ?? {}} metadata={metadata} />
          <FeedTable />
          <SyncStateInfo />
        </div>
      )}
    </PanelContainer>
  );
};
