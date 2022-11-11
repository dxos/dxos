//
// Copyright 2020 DXOS.org
//

import React, { useState } from 'react';

import { Button, Toolbar } from '@mui/material';

import { PublicKey } from '@dxos/keys';
import { SpaceSnapshot } from '@dxos/protocols/proto/dxos/echo/snapshot';
import { useDevtools, useSpaces } from '@dxos/react-client';
import { JsonTreeView } from '@dxos/react-components';

import { KeySelect, Panel } from '../../components';

export const SnapshotsPanel = () => {
  const devtoolsHost = useDevtools();
  if (!devtoolsHost) {
    return null;
  }

  const spaces = useSpaces();
  const [selectedSpaceKey, setSelectedSpaceKey] = useState<PublicKey>();
  const [snapshot, setSnapshot] = useState<SpaceSnapshot>();

  const handleSpaceChange = (key: PublicKey | undefined) => {
    setSelectedSpaceKey(key);
    if (key) {
      setTimeout(async () => {
        const { snapshot } = await devtoolsHost.getSpaceSnapshot({ spaceKey: key });
        setSnapshot(snapshot);
      });
    }
  };

  const handleSaveSnapshot = async () => {
    if (selectedSpaceKey) {
      const { snapshot } = await devtoolsHost.saveSpaceSnapshot({ spaceKey: selectedSpaceKey });
      setSnapshot(snapshot);
    }
  };

  const handleClearSnapshots = async () => {
    await devtoolsHost.clearSnapshots({});
  };

  return (
    <Panel
      controls={
        <>
          <Toolbar>
            <Button variant='outlined' onClick={handleSaveSnapshot} disabled={!selectedSpaceKey}>
              Save Snapshot
            </Button>
            <Button onClick={handleClearSnapshots}>Delete Snapshots</Button>
          </Toolbar>
          <KeySelect
            label='Space'
            keys={spaces.map(({ key }) => key)}
            selected={selectedSpaceKey}
            onChange={handleSpaceChange}
          />
        </>
      }
    >
      <JsonTreeView size='small' data={snapshot} />
    </Panel>
  );
};
