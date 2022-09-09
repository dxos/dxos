//
// Copyright 2021 DXOS.org
//

import 'setimmediate';

import React, { useEffect } from 'react';

import { ClientProvider, useClient, useProfile } from '@dxos/react-client';
import { JsonTreeView } from '@dxos/react-components';

const Main = () => {
  const client = useClient();
  const profile = useProfile();

  useEffect(() => {
    setImmediate(async () => {
      if (!profile) {
        await client.halo.createProfile();
      }
    });
  }, [profile]);

  return (
    <JsonTreeView data={profile} />
  );
};

export const SanityApp = () => {
  return (
    <ClientProvider>
      <Main />
    </ClientProvider>
  );
};

export default SanityApp;
