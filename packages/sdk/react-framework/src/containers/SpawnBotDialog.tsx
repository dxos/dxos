//
// Copyright 2020 DXOS.org
//

import React, { useState } from 'react';

import { Button, FormControl, InputLabel, MenuItem, Select } from '@mui/material';

import { Dialog } from '@dxos/react-components';
import { useBots } from '@dxos/react-registry-client';

export interface SpawnBotDialogProps {
  open: boolean,
  onClose: () => void,
  onSpawn: (dxn: string) => Promise<void>
}

export const SpawnBotDialog = ({
  open,
  onClose,
  onSpawn
} : SpawnBotDialogProps) => {
  const { bots, error } = useBots();
  const [botDXN, setBotDXN] = useState<string>();
  const [processing, setProcessing] = useState(false);

  const handleSpawnProcess = async (dxn: string) => {
    try {
      setProcessing(true);
      await onSpawn(dxn);
      onClose();
    } finally {
      setProcessing(false);
    }
  };

  const getDialogProps = () => {
    const noBotsContent = <div> No bots available. </div>;

    const spawnBotContent = (
      <FormControl fullWidth style={{ marginTop: '10px' }}>
        <InputLabel id='select-bot-label'>Select bot</InputLabel>
        <Select
          labelId='select-bot-label'
          value={botDXN || ''}
          label='Select bot'
          onChange={(event) => setBotDXN(event.target.value)}
        >
          {bots.filter(bot => bot.dxn && bot.tag === 'latest').map(({ dxn }) => (
            <MenuItem key={dxn.toString()} value={dxn.toString()}>
              {dxn.toString()}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    );

    const joinPartyActions = (
      <>
        <Button onClick={onClose}>Close</Button>
        <Button
          disabled={!!error || processing || !botDXN}
          onClick={() => botDXN && handleSpawnProcess(botDXN)}
        >
          {processing ? 'Spawning' : 'Spawn'}
        </Button>
      </>
    );

    return {
      title: 'Spawn bot',
      processing,
      content: error ? <div> Error: {error} </div> : (bots.length > 0 ? spawnBotContent : noBotsContent),
      actions: joinPartyActions
    };
  };

  const dialogProps = getDialogProps();

  return (
    <Dialog
      maxWidth='xs'
      open={open}
      {...dialogProps}
    />
  );
};
