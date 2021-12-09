//
// Copyright 2020 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { Button, TextField } from '@mui/material';

import { BotFactoryClient, BotHandle } from '@dxos/bot-factory-client';
import { PartyProxy } from '@dxos/client';
import { PublicKey } from '@dxos/crypto';
import { useClient } from '@dxos/react-client';
import { Dialog } from '@dxos/react-components';

import { handleKey } from '../helpers';

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
  const [botPath, setBotPath] = useState('./src/bots/start-story-bot');
  const [processing, setProcessing] = useState(false);
  const [botFactoryClient, setBotFactoryClient] = useState<BotFactoryClient>();

  const handleSpawnProcess = async (path: string) => {
    if (!botFactoryClient) {
      return;
    }
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

  useEffect(() => {
    const bfc = new BotFactoryClient(client.echo.networkManager);
    setImmediate(async () => {
      await bfc.start(PublicKey.from('e61469c04e4265e145f9863dd4b84fd6dee8f31e10160c38f9bb3c289e3c09bc'));
      setBotFactoryClient(bfc);
    });
  }, []);

  return (
    <Dialog
      maxWidth='xs'
      open={open}
      {...dialogProps}
    />
  );
};
