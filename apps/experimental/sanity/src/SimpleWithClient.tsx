//
// Copyright 2021 DXOS.org
//
import 'setimmediate';
import React, { useState } from 'react';

import { ClientProvider, useClient } from '@dxos/react-client';
import { JsonTreeView } from '@dxos/react-components';


const Main = () => {
  const client = useClient();
  return (
    <JsonTreeView data={client} />
  );
}

export const SimpleWithClient = () => {
  const [count, setCount] = useState(1);

  return (
    <ClientProvider>
      <Main />
    </ClientProvider>
  );
};

export const SimpleWithRemoteClient = ({ clientProvider }: { clientProvider: any }) => {
  const RemoteClientProvider = clientProvider;
  return (
    <RemoteClientProvider>
      <Main />
    </RemoteClientProvider>
  );
};
