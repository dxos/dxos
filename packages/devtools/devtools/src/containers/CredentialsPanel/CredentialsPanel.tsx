//
// Copyright 2020 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { PublicKey } from '@dxos/keys';
import { Credential } from '@dxos/protocols/proto/dxos/halo/credentials';
import { useClientServices, useDevtools, useStream } from '@dxos/react-client';
import { JsonTreeView } from '@dxos/react-components-deprecated';

import { KeySelect, Panel } from '../../components';

export const CredentialsPanel = () => {
  const devtoolsHost = useDevtools();
  if (!devtoolsHost) {
    return null;
  }
  const spaces = useStream(() => devtoolsHost.subscribeToSpaces({}), {}).spaces ?? [];

  const [selectedSpaceKey, setSelectedSpaceKey] = useState<PublicKey>();

  const services = useClientServices();
  if (!services) {
    return null;
  }

  const [credentials, setCredentials] = useState<Credential[]>([]);

  useEffect(() => {
    if (!selectedSpaceKey) {
      return;
    }
    const stream = services.SpacesService.queryCredentials({ spaceKey: selectedSpaceKey });
    const newCredentials: Credential[] = [];

    stream.subscribe((credential) => {
      newCredentials.push(credential);
      setCredentials([...newCredentials]);
    });

    return () => {
      stream.close();
    };
  }, [selectedSpaceKey?.toHex()]);

  return (
    <Panel
      controls={
        <KeySelect
          label='Space'
          keys={spaces.map(({ key }) => key)}
          selected={selectedSpaceKey}
          onChange={(key) => setSelectedSpaceKey(key)}
          humanize={true}
        />
      }
    >
      <JsonTreeView size='small' data={credentials} />
    </Panel>
  );
};
