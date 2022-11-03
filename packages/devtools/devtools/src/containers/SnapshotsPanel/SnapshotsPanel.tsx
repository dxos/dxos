//
// Copyright 2020 DXOS.org
//

import React, { useState } from 'react';

import { Button, Toolbar } from '@mui/material';

import { PublicKey } from '@dxos/keys';
import { PartySnapshot } from '@dxos/protocols/proto/dxos/echo/snapshot';
import { useDevtools, useParties } from '@dxos/react-client';
import { JsonTreeView } from '@dxos/react-components';

import { KeySelect, Panel } from '../../components';

export const SnapshotsPanel = () => {
  const devtoolsHost = useDevtools();
  const parties = useParties();
  const [selectedspaceKey, setSelectedspaceKey] = useState<PublicKey>();
  const [snapshot, setSnapshot] = useState<PartySnapshot>();

  const handlePartyChange = (key: PublicKey | undefined) => {
    setSelectedspaceKey(key);
    if (key) {
      setTimeout(async () => {
        const { snapshot } = await devtoolsHost.getPartySnapshot({ spaceKey: key });
        setSnapshot(snapshot);
      });
    }
  };

  const handleSaveSnapshot = async () => {
    if (selectedspaceKey) {
      const { snapshot } = await devtoolsHost.savePartySnapshot({ spaceKey: selectedspaceKey });
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
            <Button variant='outlined' onClick={handleSaveSnapshot} disabled={!selectedspaceKey}>
              Save Snapshot
            </Button>
            <Button onClick={handleClearSnapshots}>Delete Snapshots</Button>
          </Toolbar>
          <KeySelect
            label='Party'
            keys={parties.map(({ key }) => key)}
            selected={selectedspaceKey}
            onChange={handlePartyChange}
          />
        </>
      }
    >
      <JsonTreeView size='small' data={snapshot} />
    </Panel>
  );
};
