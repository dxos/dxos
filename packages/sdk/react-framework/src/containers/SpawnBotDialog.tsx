//
// Copyright 2020 DXOS.org
//

import React, {useState } from 'react';

import { Button, TextField } from '@mui/material';

import type { BotHandle } from '@dxos/bot-factory-client';
import { PartyProxy } from '@dxos/client';
import { useClient } from '@dxos/react-client';
import { Dialog } from '@dxos/react-components';

import { handleKey } from '../helpers';
import { useBotFactoryClient } from '@dxos/react-bot-factory-client';

export interface SpawnBotDialogProps {
  open: boolean,
  onClose: () => void,
  party: PartyProxy,
  onBotCreated: (bot: BotHandle) => void
}

export const SpawnBotDialog = ({
  open,
  onClose,
  party,
  onBotCreated
} : SpawnBotDialogProps) => {
  const client = useClient();
  const [botPath, setBotPath] = useState('./stories/bots/start-story-bot');
  const [processing, setProcessing] = useState(false);

  const botFactoryClient = useBotFactoryClient();

  const handleSpawnProcess = async (path: string) => {
    try {
      setProcessing(true);
      const botHandle = await botFactoryClient.spawn(
        { localPath: path },
        client,
        party
      );
      onBotCreated(botHandle);
      onClose();
    } finally {
      setProcessing(false);
    }
  };

  const getDialogProps = () => {
    const inviteBotContent = (
      <TextField
        autoFocus
        fullWidth
        placeholder='Type in path to a local bot.'
        spellCheck={false}
        value={botPath}
        onChange={(event) => setBotPath(event.target.value)}
        onKeyDown={handleKey('Enter', () => handleSpawnProcess(botPath))}
      />
    );

    const joinPartyActions = (
      <>
        <Button onClick={onClose}>Close</Button>
        <Button disabled={processing || !botFactoryClient} onClick={() => handleSpawnProcess(botPath)}>Spawn</Button>
      </>
    );

    return {
      title: 'Spawn bot',
      processing,
      content: inviteBotContent,
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
