//
// Copyright 2020 DXOS.org
//

import React, { useState } from 'react';

import { useClient, useParties, useProfile } from '@dxos/react-client';

const App = () => {
  const client = useClient();
  const profile = useProfile();
  const [error, setError] = useState<Error | undefined>(undefined);

  if (error) {
    return <p>Connection failed.</p>;
  }

  if (!client.initialized) {
    return <p>Connecting to the DXOS Wallet Extension...</p>;
  }

  if (!profile) {
    return <p>You have no DXOS profile. Create it in the DXOS Wallet extension.</p>;
  }

  return (
    <div style={{ minWidth: 400 }}>
      <p>Hello, {profile.username ?? profile.publicKey}</p>
      <p>{profile.publicKey}</p>
    </div>
  );
};

export default App;
