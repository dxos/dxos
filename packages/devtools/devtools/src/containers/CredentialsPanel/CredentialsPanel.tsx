//
// Copyright 2020 DXOS.org
//

import React, { useState } from 'react';

import { PublicKey } from '@dxos/keys';
import { useClientServices, useDevtools, useStream } from '@dxos/react-client';
import { JsonTreeView } from '@dxos/react-components';

import { KeySelect, Panel } from '../../components';

export const CredentialsPanel = () => {
  const [selectedSpaceKey, setSelectedSpaceKey] = useState<PublicKey>();

  const devtoolsHost = useDevtools();
  if (!devtoolsHost) {
    return null;
  }
  const spaces = useStream(() => devtoolsHost.subscribeToSpaces({}), {}).spaces ?? [];

  const services = useClientServices();
  if (!services) {
    return null;
  }
  const credentials = useStream(() => services.SpacesService.queryCredentials({ selectedSpaceKey }), {}) ?? [];

  return (
    <Panel
      controls={
        <KeySelect
          label='Space'
          keys={spaces.map(({ key }) => key)}
          selected={selectedSpaceKey}
          onChange={(key) => setSelectedSpaceKey(key)}
        />
      }
    >
      <JsonTreeView size='small' data={credentials} />
    </Panel>
  );
};
