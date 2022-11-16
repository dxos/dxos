//
// Copyright 2020 DXOS.org
//

import React, { useState } from 'react';

import { PublicKey } from '@dxos/keys';
import { useDevtools, useSpaces, useStream } from '@dxos/react-client';
import { JsonTreeView } from '@dxos/react-components';

import { KeySelect, Panel } from '../../components';

export const CredentialMessagesPanel = () => {
  const [selectedSpaceKey, setSelectedSpaceKey] = useState<PublicKey>();
  const spaces = useSpaces();
  const devtoolsHost = useDevtools();
  if (!devtoolsHost) {
    return null;
  }

  const { messages } = useStream(() => devtoolsHost.subscribeToCredentialMessages({ spaceKey: selectedSpaceKey }), {}, [
    selectedSpaceKey
  ]);

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
      <JsonTreeView size='small' data={messages} />
    </Panel>
  );
};
