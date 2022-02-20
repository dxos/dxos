//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { ClientProvider, ProfileInitializer, useProfile } from '@dxos/react-client';

import { ONLINE_CONFIG } from './config';

export default {
  title: 'HelloWorld/App'
};

/**
 * Main component.
 */
const App = () => {
  const profile = useProfile();

  // TODO(burdon): Tutorial
  // 1. useClient to create party.
  // 2. useSelection to query for items.
  // 3. createItem to create data.
  // 4. Deploy.
  // 5. PartySharingDialog
  // 6. JoinPartyDialog

  return (
    <div>
      <h1>App</h1>
      <pre>
        {JSON.stringify(profile, undefined, 2)}
      </pre>
    </div>
  );
};

/**
 * Single-player App story.
 */
export const Primary = () => {
  return (
    <ClientProvider config={ONLINE_CONFIG}>
      <ProfileInitializer>
        <App />
      </ProfileInitializer>
    </ClientProvider>
  );
};
