//
// Copyright 2020 DXOS.org
//

import React, { useState } from 'react';

import { PublicKey } from '@dxos/crypto';
import { useClient, useParties } from '@dxos/react-client';
import { JsonTreeView } from '@dxos/react-components';

import { KeySelect, Panel } from '../../components';
import { useStream } from '../../hooks';

export const CredentialMessagesPanel = () => {
  const [selectedPartyKey, setSelectedPartyKey] = useState<PublicKey>();
  const parties = useParties();

  const client = useClient();
  const devtoolsHost = client.services.DevtoolsHost;
  const { messages } = useStream(
    () => devtoolsHost.subscribeToCredentialMessages({ partyKey: selectedPartyKey }), [selectedPartyKey]
  ) ?? {};

  return (
    <Panel controls={(
      <KeySelect
        label='Party'
        keys={parties.map(({ key }) => key)}
        selected={selectedPartyKey}
        onChange={key => setSelectedPartyKey(key)}
      />
    )}>
      <JsonTreeView
        size='small'
        data={messages}
      />
    </Panel>
  );
};
