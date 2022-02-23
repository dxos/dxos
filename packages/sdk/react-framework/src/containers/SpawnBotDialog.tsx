//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import React, { useState } from 'react';

import { Button, FormControl, InputLabel, MenuItem, Select } from '@mui/material';

import type { BotHandle } from '@dxos/bot-factory-client';
import { Party } from '@dxos/client';
import { useBotFactoryClient, useConfig } from '@dxos/react-client';
import { Dialog } from '@dxos/react-components';
import { useBots } from '@dxos/react-registry-client';

export interface SpawnBotDialogProps {
  open: boolean,
  onClose: () => void,
  party: Party,
  onBotCreated: (bot: BotHandle) => void
}

export const SpawnBotDialog = ({
  open,
  onClose,
  party,
  onBotCreated
} : SpawnBotDialogProps) => {
  const { bots, error } = useBots();
  const [botPath, setBotPath] = useState<string>();
  const [processing, setProcessing] = useState(false);
  const config = useConfig();
  const botFactoryClient = useBotFactoryClient(config);

  const handleSpawnProcess = async (dxn: string) => {
    try {
      assert(botFactoryClient, 'Bot factory client is not available.');
      setProcessing(true);
      const botHandle = await botFactoryClient.spawn(
        { dxn },
        party
      );

      onBotCreated(botHandle);
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
          value={botPath || ''}
          label='Select bot'
          onChange={(event) => setBotPath(event.target.value)}
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
          disabled={!!error || processing || !botFactoryClient || !botPath}
          onClick={() => botPath && handleSpawnProcess(botPath)}
        >
          {botFactoryClient ? (processing ? 'Spawning' : ('Spawn')) : 'Loading...'}
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
