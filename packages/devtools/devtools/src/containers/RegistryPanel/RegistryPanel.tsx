//
// Copyright 2022 DXOS.org
//

import React, { useState } from 'react';

import { useAsyncEffect } from '@dxos/react-async';
import { JsonTreeView } from '@dxos/react-components';
import { useRegistry } from '@dxos/react-registry-client';
import { RegistrySearchPanel, useRegistrySearchModel } from '@dxos/react-toolkit';
import { CID, RegistryRecord, ResourceSet } from '@dxos/registry-client';

import { Panel } from '../../components/index.js';

// TODO(wittjosiah): Add table results similar to console.
export const RegistryPanel = () => {
  const registry = useRegistry();
  const model = useRegistrySearchModel(registry);
  const [selectedCID, setSelectedCID] = useState<CID>();
  const [selectedRecord, setSelectedRecord] = useState<RegistryRecord>();

  useAsyncEffect(async () => {
    if (!selectedCID) {
      return;
    }

    const record = await registry.getRecord(selectedCID);
    setSelectedRecord(record);
  }, [selectedCID]);

  const handleSelect = (resource: ResourceSet, tag = 'latest') => {
    setSelectedCID(resource.tags[tag]);
  };

  return (
    <Panel
      controls={(
        <RegistrySearchPanel
          model={model}
          versions
          onSelect={handleSelect}
        />
      )}
    >
      <JsonTreeView data={selectedRecord} />
    </Panel>
  );
};
