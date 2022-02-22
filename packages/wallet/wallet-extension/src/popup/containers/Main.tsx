//
// Copyright 2020 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { Button } from '@mui/material';

import { Config } from '@dxos/config';
import { keyPairFromSeedPhrase } from '@dxos/crypto';
import { useClient, useConfig, useProfile } from '@dxos/react-client';
import { JoinHaloDialog, RegistrationDialog, RegistrationDialogProps } from '@dxos/react-framework';

export const Main = () => {
  const client = useClient();
  const [remoteConfig, setRemoteConfig] = useState<Config | undefined>();
  const [parties, setParties] = useState<any[]>([]);
  const profile = useProfile();
  const [error, setError] = useState<Error | undefined>(undefined);
  const [inProgress, setInProgress] = useState(false);
  const [joinHaloDialog, setJoinHaloDialog] = useState(false);

  useEffect(() => {
    setImmediate(async () => {
      try {
        const remoteConfig = await client.services.SystemService.getConfig();
        setRemoteConfig(new Config(remoteConfig));
      } catch (error: any) {
        setError(error);
      }
    });
  }, []);

  useEffect(() => {
    const partyStream = client.services.PartyService.subscribeParties();
    partyStream.subscribe(response => setParties(response.parties ?? []), error => setError(error));
    return () => partyStream.close();
  }, []);

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

  const handleCreateParty = async () => {
    setInProgress(true);
    try {
      await client.services.PartyService.createParty();
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

  if (joinHaloDialog) {
    return (
      <JoinHaloDialog
        open
        modal={false}
        onClose={() => setJoinHaloDialog(false)}
      />
    );
  }

  if (!profile) {
    return (
      <RegistrationDialog
        open
        modal={false}
        onComplete={handleCreateProfile}
        onRestore={null as any}
        onJoinHalo={() => setJoinHaloDialog(true)}
      />
    );
  }

  return (
    <div style={{ minWidth: 400 }}>
      <p>Hello, {profile.username ?? profile.publicKey.toString()}</p>
      {remoteConfig?.get('runtime.services.dxns.address') &&
        <p>Your Polkadot Address: {remoteConfig.get('runtime.services.dxns.address')}</p>
      }
      {remoteConfig?.get('runtime.services.dxns.account') &&
        <p>Your DXNS Account: {remoteConfig.get('runtime.services.dxns.account')}</p>
      }
      <p>Your profile public key: {profile.publicKey.toString()}</p>
      <Button disabled={inProgress} onClick={handleReset} variant='outlined'>Reset</Button>
      <Button disabled={inProgress} onClick={() => setJoinHaloDialog(true)} variant='outlined'>Join HALO</Button>
      <Button disabled={inProgress} onClick={handleCreateParty} variant='outlined'>Create party</Button>
      <p>You have {parties.length} parties.</p>
    </div>
  );
};
