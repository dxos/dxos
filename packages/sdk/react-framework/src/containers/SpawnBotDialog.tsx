//
// Copyright 2020 DXOS.org
//

import debug from 'debug';
import React, { useEffect, useState } from 'react';

import type { BotHandle } from '@dxos/bot-factory-client';
import { Party } from '@dxos/client';
import { raise } from '@dxos/debug';
import { useBotFactoryClient, useConfig } from '@dxos/react-client';
import { useRegistry } from '@dxos/react-registry-client';
import { DXN, Resource, ResourceRecord } from '@dxos/registry-client';

import { RegistrySearchDialog, RegistrySearchDialogProps } from './RegistrySearchDialog';

const log = debug('dxos:react-framework:SpawnBotDialog');

const BOT_TYPE_DXN = DXN.parse('dxos:type.bot');

export interface SpawnBotDialogProps extends Omit<RegistrySearchDialogProps, 'onSearch' | 'onSelect'> {
  party: Party
  onBotCreated: (bot: BotHandle) => void
}

export const SpawnBotDialog = ({
  party,
  onBotCreated,
  ...props
}: SpawnBotDialogProps) => {
  const config = useConfig();
  const botFactoryClient = useBotFactoryClient(config);
  const registry = useRegistry();
  const [botType, setBotType] = useState<ResourceRecord>();

  useEffect(() => {
    setImmediate(async () => {
      const botType = await registry.getResourceRecord(BOT_TYPE_DXN, 'latest') ?? raise(new Error('Bot type not found.'));
      setBotType(botType);
    });
  });

  const handleSearch = (searchInput: string) => registry.queryResources({ text: searchInput });

  const handleSelect = async (resource: Resource) => {
    if (!botFactoryClient) {
      log('Bot factory client is not available.');
      return;
    }

    const botHandle = await botFactoryClient.spawn({
      dxn: resource.id.toString()
    }, party);

    onBotCreated(botHandle);
  };

  if (!botType) {
    return null;
  }

  return (
    <RegistrySearchDialog
      title='Spawn Bot'
      typeFilter={[botType.record.cid]}
      onSearch={handleSearch}
      onSelect={handleSelect}
      closeOnSuccess
      {...props}
    />
  );
};
