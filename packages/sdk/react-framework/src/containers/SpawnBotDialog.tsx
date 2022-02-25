//
// Copyright 2020 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { Button, FormControl, InputLabel, MenuItem, Select } from '@mui/material';

import { sleep } from '@dxos/async';
import type { BotHandle } from '@dxos/bot-factory-client';
import { Party } from '@dxos/client';
import { useBotFactoryClient, useConfig } from '@dxos/react-client';
import { Dialog } from '@dxos/react-components';
import { useBots, useRegistry } from '@dxos/react-registry-client';
import { RegistryTypeRecord, Resource } from '@dxos/registry-client';

import { RegistrySearchDialog } from './RegistrySearchDialog';

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
  const registry = useRegistry();
  const [botType, setBotType] = useState<RegistryTypeRecord | undefined>();
  const { bots, error } = useBots();
  const [botPath, setBotPath] = useState<string>();
  const [processing, setProcessing] = useState(false);
  const config = useConfig();
  const botFactoryClient = useBotFactoryClient(config);

  const handleSearch = (searchInput: string) => registry.queryResources({ text: searchInput });

  useEffect(() => {
    const loadBotType = async () => {
      const queriedBotType = await registry.getTypeRecords();
      setBotType(queriedBotType[0]);
    };

    loadBotType();
  }, []);

  const handleSpawnProcess = async (dxn: string) => {
    if (!botFactoryClient) {
      console.log('Bot factory client is not available.');
      return;
    }

    setProcessing(true);
    const botHandle = await botFactoryClient.spawn(
      { dxn },
      party
    );

    onBotCreated(botHandle);
    onClose();

    setProcessing(false);
  };

  const noBotsContent = <div> No bots available. </div>;

  const spawnBotContent = (
    <>
      <RegistrySearchDialog
        open={open}
        // selectedType={botType?.cid}
        modal={false}
        onSearch={handleSearch}
        onSelect={() => sleep(1000).then(() => {})}
        onClose={() => {}}
      />
      {/* <FormControl fullWidth style={{ marginTop: '10px' }}>
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
      </FormControl> */}
    </>
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

  return (
    <Dialog
      maxWidth='md'
      open={open}
      title='Spawn Bot'
      processing={processing}
      actions={joinPartyActions}
      // content={error ? <div> Error: {error} </div> : (bots.length > 0 ? spawnBotContent : noBotsContent)}
      content={spawnBotContent}
    />
  );
};
