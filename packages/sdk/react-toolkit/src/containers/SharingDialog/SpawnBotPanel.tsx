//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { useAsyncEffect } from '@dxos/react-async';
import { useRegistry } from '@dxos/react-registry-client';
import { ResourceSet } from '@dxos/registry-client';

import { useRegistrySearchModel, RegistrySearchPanel } from '../RegistrySearch/index.js';

interface SpawnBotDialogProps {
  onSelect: (resource: ResourceSet) => void
}

export const SpawnBotPanel = ({
  onSelect
}: SpawnBotDialogProps) => {
  const registry = useRegistry();

  // TODO(burdon): Create hook to create pre-filtered model.
  const model = useRegistrySearchModel(registry);
  useAsyncEffect(async () => {
    await model.initialize();
    // TODO(burdon): DXN of type?
    // const botType = model.types.find(type => type.type.messageName === '.dxos.type.Bot');
    // model.setFilters([
    //   createTypeFilter([botType!.cid])
    // ]);
  }, []);

  return (
    <RegistrySearchPanel
      model={model}
      onSelect={onSelect}
    />
  );
};
