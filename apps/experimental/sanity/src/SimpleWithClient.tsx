//
// Copyright 2021 DXOS.org
//
import 'setimmediate';
import React from 'react';

import { ClientProvider, useClient } from '@dxos/react-client';
import { JsonTreeView } from '@dxos/react-components';

const Main = () => {
  const client = useClient();
  return (
    <JsonTreeView data={client} />
  );
};

export const SimpleWithClient = () => {
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
