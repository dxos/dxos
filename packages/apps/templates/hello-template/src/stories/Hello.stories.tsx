//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { ClientProvider, useClient, useProfile } from '@dxos/react-client';
import { ProfileInitializer } from '@dxos/react-client-testing';

import { ONLINE_CONFIG } from './config';

export default {
  title: 'HelloWorld/Hello'
};

const App = () => {
  const profile = useProfile();
  const client = useClient();

  return (
    <div style={{ padding: 8 }}>
      <pre>
        {JSON.stringify(profile, undefined, 2)}
      </pre>
      <pre>
        {JSON.stringify(client.config, undefined, 2)}
      </pre>
    </div>
  );
};

export const Primary = () => (
  <ClientProvider config={ONLINE_CONFIG}>
    <ProfileInitializer>
      <App />
    </ProfileInitializer>
  </ClientProvider>
);
