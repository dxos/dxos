//
// Copyright 2020 DXOS.org
//

import React, { useState } from 'react';

import { createKeyPair, keyPairFromSeedPhrase } from '@dxos/crypto';
import { useClient, useProfile } from '@dxos/react-client';
import { ProfileDialog, RegistrationDialog, RegistrationDialogProps } from '@dxos/react-framework';

const App = () => {
  const client = useClient();
  const profile = useProfile();
  const [error, setError] = useState<Error | undefined>(undefined);
  const [inProgress, setInProgress] = useState(false);

  const handleCreateProfile: RegistrationDialogProps['onComplete'] = async (seed, username) => {
    setInProgress(true);
    try {
      const keypair = keyPairFromSeedPhrase(seed);
      await client.halo.createProfile({ ...keypair, username });
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
      window.location.reload();
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
      <RegistrationDialog
        open={true}
        onComplete={handleCreateProfile}
        onRestore={null as any}
      />
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

export default App;
