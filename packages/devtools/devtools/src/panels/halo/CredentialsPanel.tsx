//
// Copyright 2020 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { PublicKey } from '@dxos/keys';
import { Credential } from '@dxos/protocols/proto/dxos/halo/credentials';
import { useClientServices, useDevtools, useStream } from '@dxos/react-client';
import { JsonTreeView } from '@dxos/react-components-deprecated';

import { KeySelect, Panel } from '../../components';

// TODO(burdon): Blows up since JSON data is too large.

export const CredentialsPanel = () => {
  const devtoolsHost = useDevtools();
  const spaces = useStream(() => devtoolsHost.subscribeToSpaces({}), {}).spaces ?? [];
  const [selectedSpaceKey, setSelectedSpaceKey] = useState<PublicKey>();
  const services = useClientServices();
  const [credentials, setCredentials] = useState<Credential[]>([]);

  useEffect(() => {
    if (!services || !selectedSpaceKey) {
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

  if (!services) {
    return null;
  }

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
