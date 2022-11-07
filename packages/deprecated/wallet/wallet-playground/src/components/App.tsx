//
// Copyright 2020 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { Button } from '@mui/material';

import { useClient, useProfile, useClientServices } from '@dxos/react-client';
import { HaloSharingDialog, JoinHaloDialog, RegistrationDialog, RegistrationDialogProps } from '@dxos/react-toolkit';

const App = () => {
  const client = useClient();
  const profile = useProfile();
  const [parties, setParties] = useState<any[]>([]);
  const [error, setError] = useState<Error | undefined>(undefined);
  const [inProgress, setInProgress] = useState(false);
  const [joinHaloDialog, setJoinHaloDialog] = useState(false);
  const [haloSharingDialog, setHaloSharingDialog] = useState(false);
  const [remoteConfig, setRemoteConfig] = useState<string>('');
  const services = useClientServices();
  if (!services) {
    return null;
  }

  useEffect(() => {
    services.SystemService.getConfig()
      .then((remote) => setRemoteConfig(JSON.stringify(remote)))
      .catch(setError);
  }, []);

  useEffect(() => {
    const partyStream = services.PartyService.subscribeParties();
    partyStream.subscribe(
      (response) => setParties(response.parties ?? []),
      (error) => setError(error)
    );
    return () => partyStream.close();
  }, []);

  const handleCreateProfile: RegistrationDialogProps['onComplete'] = async (seedphrase, displayName) => {
    setInProgress(true);
    try {
      await client.halo.createProfile({ seedphrase, displayName });
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
      await client.reset();
      window.location.reload();
    } catch (e: any) {
      console.error(e);
      setError(e);
    } finally {
      setInProgress(false);
    }
  };

  const handleCreateParty = async () => {
    setInProgress(true);
    try {
      await services.PartyService.createParty();
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
        <RegistrationDialog
          open={!joinHaloDialog}
          onComplete={handleCreateProfile}
          onRestore={null as any}
          onJoinHalo={() => setJoinHaloDialog(true)}
        />
        <JoinHaloDialog open={joinHaloDialog} closeOnSuccess onClose={() => setJoinHaloDialog(false)} />
      </>
    );
  }

  return (
    <div style={{ minWidth: 400 }}>
      <p>Hello, {profile.displayName ?? profile.identityKey.toString()}</p>
      <p>{profile.identityKey.toString()}</p>
      <Button disabled={inProgress} onClick={handleReset} variant='outlined'>
        Reset
      </Button>
      <Button disabled={inProgress} onClick={() => setHaloSharingDialog(true)} variant='outlined'>
        Share HALO
      </Button>
      <HaloSharingDialog open={haloSharingDialog} onClose={() => setHaloSharingDialog(false)} />

      <Button disabled={inProgress} onClick={handleCreateParty} variant='outlined'>
        Create party
      </Button>
      <p>You have {parties.length} parties.</p>

      <details>
        <summary>Local Client config</summary>
        {JSON.stringify(client.config.values)}
      </details>

      <details>
        <summary>Remote Client config</summary>
        {remoteConfig}
      </details>
    </div>
  );
};

export default App;
