//
// Copyright 2020 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { raise } from '@dxos/debug';
import { useRegistry } from '@dxos/react-registry-client';
import { DXN, ResourceRecord } from '@dxos/registry-client';

import { RegistrySearchDialog, RegistrySearchDialogProps } from './RegistrySearchDialog';

const BOT_TYPE_DXN = DXN.parse('dxos:type.bot');

export const SpawnBotDialog = ({ ...props }: RegistrySearchDialogProps) => {
  const registry = useRegistry();
  const [botType, setBotType] = useState<ResourceRecord>();

  useEffect(() => {
    setImmediate(async () => {
      const botType = await registry.getResourceRecord(BOT_TYPE_DXN, 'latest') ?? raise(new Error('Bot type not found.'));
      setBotType(botType);
    });
  });

  if (!botType) {
    return null;
  }

  return (
    <RegistrySearchDialog
      title='Spawn Bot'
      typeFilter={[botType.record.cid]}
      closeOnSuccess
      {...props}
    />
  );
};
