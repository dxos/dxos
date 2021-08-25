//
// Copyright 2020 DXOS.org
//

import React, { useState, useEffect } from 'react';

import { GetProfileResponse } from '@dxos/wallet-core';

import { useContentScript } from '../hooks';

const App = () => {
  const [profile, setProfile] = useState<GetProfileResponse | undefined>(undefined);
  const { error: connectionError, rpcClient: contentScript } = useContentScript();
  const [error, setError] = useState<Error | undefined>(undefined)
  const rpcClient = contentScript?.rpc;

  useEffect(() => {
    if (rpcClient === undefined) {
      return;
    }

    setImmediate(async () => {
      try {
        setProfile(await rpcClient.GetProfile({}));
      } catch (err) {
        setError(err)
        console.error('Cannot get the profile', err);
      }
    });
  }, [rpcClient]);

  if (connectionError) {
    console.error(connectionError);
    return <p>Connection failed.</p>;
  }

  if (error) {
    return <p>Connection failed.</p>;
  }

  if (!rpcClient) {
    return <p>Connecting to the DXOS Wallet Extension...</p>;
  }

  if (!profile) {
    return <p>Loading profile...</p>;
  }

  if (!profile.publicKey) {
    return <p>No profile created.</p>;
  }

  return (
    <div style={{ minWidth: 400 }}>
      <p>Hello, {profile.username ?? profile.publicKey}</p>
      <p>{profile.publicKey}</p>
    </div>
  );
};

export default App;
