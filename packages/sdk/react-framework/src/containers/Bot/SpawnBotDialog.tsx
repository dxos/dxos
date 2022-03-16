//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { useAsyncEffect } from '@dxos/react-async';
import { Dialog } from '@dxos/react-components';
import { IRegistryClient, Resource } from '@dxos/registry-client';

import { createTypeFilter, useRegistrySearchModel, RegistrySearchPanel } from '../RegistrySearch';

interface SpawnBotDialogProps {
  registry: IRegistryClient
  open: boolean
  onClose: () => void
  onSelect: (resource: Resource) => void
}

// TODO(burdon): Panel (with invite).
export const SpawnBotDialog = ({
  registry,
  open,
  onClose,
  onSelect
}: SpawnBotDialogProps) => {
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

  return (
    <Dialog
      open={open}
      onClose={onClose}
      content={(
        <RegistrySearchPanel
          model={model}
          onSelect={onSelect}
        />
      )}
    />
  );
};
