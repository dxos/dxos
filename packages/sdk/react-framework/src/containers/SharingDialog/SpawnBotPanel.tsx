//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { Party } from '@dxos/client';
import { useAsyncEffect } from '@dxos/react-async';
import { useBotFactoryClient } from '@dxos/react-client';
import { useRegistry } from '@dxos/react-registry-client';
import { Resource } from '@dxos/registry-client';

import { createTypeFilter, useRegistrySearchModel, RegistrySearchPanel } from '../RegistrySearch';

interface SpawnBotDialogProps {
  party: Party
  onClose: () => void
}

export const SpawnBotPanel = ({
  party,
  onClose // TODO(burdon): Close?
}: SpawnBotDialogProps) => {
  const registry = useRegistry();
  const botClient = useBotFactoryClient();

  // TODO(burdon): Create hook to create pre-filtered model.
  const model = useRegistrySearchModel(registry);
  useAsyncEffect(async () => {
    await model.initialize();
    // TODO(burdon): DXN of type?
    const botType = model.types.find(type => type.messageName === '.dxos.type.Bot');
    model.setFilters([
      createTypeFilter([botType!.cid])
    ]);
  }, []);

  const handleBotInvitation = async (resource: Resource) => {
    await botClient!.spawn({ dxn: resource.id.toString() }, party!);
    onClose(); // TODO(burdon): On pending?
  };

  return (
    <RegistrySearchPanel
      model={model}
      onSelect={handleBotInvitation}
    />
  );
};
