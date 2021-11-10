//
// Copyright 2020 DXOS.org
//

import React, { useState } from 'react';

import { createKeyPair } from '@dxos/crypto';
import { useClient, useProfile } from '@dxos/react-client';

const Main = () => {
  const client = useClient();
  const profile = useProfile();
  const [error, setError] = useState<Error | undefined>(undefined);
  const [inProgress, setInProgress] = useState(false);

  const handleCreateProfile = async () => {
    setInProgress(true);
    try {
      await client.halo.createProfile({ ...createKeyPair(), username: 'test' });
    } catch (e: any) {
      console.error(e);
      setError(e);
    } finally {
      setInProgress(false);
    }
  };

  const handleReset = async () => {
    setInProgress(true);
    try {
      await client.halo.reset();
    } catch (e: any) {
      console.error(e);
      setError(e);
    } finally {
      setInProgress(false);
    }
  };

  if (error) {
    return (
<>
      <p>Something went wrong.</p>
      <details>{String(error)}</details>
    </>
    );
  }

  if (!client.initialized) {
    return <p>Connecting to the DXOS Wallet Extension...</p>;
  }

  if (!profile) {
    return (
      <>
        <p>You have no DXOS profile. Create it in the DXOS Wallet extension.</p>
        <button disabled={inProgress} onClick={handleCreateProfile}>Create test profile</button>
      </>
    );
  }

  return (
    <div style={{ minWidth: 400 }}>
      <p>Hello, {profile.username ?? profile.publicKey.toString()}</p>
      <p>{profile.publicKey.toString()}</p>
      <button disabled={inProgress} onClick={handleReset}>Reset</button>
    </div>
  );
};

export default Main;
