//
// Copyright 2020 DXOS.org
//

import React, { useState } from 'react';

import { PartyProxy } from '@dxos/client';
import { useClient, useParties } from '@dxos/react-client';
import { JsonTreeView } from '@dxos/react-components';

import { Panel, PartySelect } from '../components';
import { useStream } from '../hooks';

export const CredentialMessagesPanel = () => {
  const [selectedParty, setSelectedParty] = useState<PartyProxy>();
  const parties = useParties();

  const client = useClient();
  const devtoolsHost = client.services.DevtoolsHost;
  const result = useStream(
    () => devtoolsHost.SubscribeToCredentialMessages({ partyKey: selectedParty?.key }),
    [selectedParty?.key]
  );

  return (
    <Panel controls={(
      <PartySelect
        parties={parties}
        selected={selectedParty}
        onChange={setSelectedParty}
      />
    )}>
      <JsonTreeView
        size='small'
        data={result?.messages}
      />
    </Panel>
  );
};
