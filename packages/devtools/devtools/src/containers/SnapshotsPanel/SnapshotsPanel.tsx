//
// Copyright 2020 DXOS.org
//

import React, { useState } from 'react';

import { Button, Toolbar } from '@mui/material';

import { PublicKey } from '@dxos/keys';
import { PartySnapshot } from '@dxos/protocols/proto/dxos/echo/snapshot';
import { useDevtools, useSpaces } from '@dxos/react-client';
import { JsonTreeView } from '@dxos/react-components';

import { KeySelect, Panel } from '../../components';

export const SnapshotsPanel = () => {
  const devtoolsHost = useDevtools();
  if (!devtoolsHost) {
    return null;
  }

  const parties = useSpaces();
  const [selectedPartyKey, setSelectedPartyKey] = useState<PublicKey>();
  const [snapshot, setSnapshot] = useState<PartySnapshot>();

  const handlePartyChange = (key: PublicKey | undefined) => {
    setSelectedPartyKey(key);
    if (key) {
      setTimeout(async () => {
        const { snapshot } = await devtoolsHost.getPartySnapshot({ partyKey: key });
        setSnapshot(snapshot);
      });
    }
  };

  const handleSaveSnapshot = async () => {
    if (selectedPartyKey) {
      const { snapshot } = await devtoolsHost.savePartySnapshot({ partyKey: selectedPartyKey });
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
            <Button variant='outlined' onClick={handleSaveSnapshot} disabled={!selectedPartyKey}>
              Save Snapshot
            </Button>
            <Button onClick={handleClearSnapshots}>Delete Snapshots</Button>
          </Toolbar>
          <KeySelect
            label='Party'
            keys={parties.map(({ key }) => key)}
            selected={selectedPartyKey}
            onChange={handlePartyChange}
          />
        </>
      }
    >
      <JsonTreeView size='small' data={snapshot} />
    </Panel>
  );
};
