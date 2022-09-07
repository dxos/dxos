//
// Copyright 2020 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { Button } from '@mui/material';

import { Config } from '@dxos/config';
import { useClient, useProfile } from '@dxos/react-client';
import { JoinHaloDialog, RegistrationDialog, RegistrationDialogProps } from '@dxos/react-toolkit';

export const Main = () => {
  const client = useClient();
  const [parties, setParties] = useState<any[]>([]);
  const profile = useProfile();
  const [error, setError] = useState<Error | undefined>(undefined);
  const [inProgress, setInProgress] = useState(false);
  const [joinHaloDialog, setJoinHaloDialog] = useState(false);
  const [polkadotAddress, setPolkadotAddress] = useState<string | undefined>();
  const [DXNSAccount, setDXNSAccount] = useState<string | undefined>();

  useEffect(() => {
    setImmediate(async () => {
      try {
        const remoteConfig = new Config(await client.services.SystemService.getConfig());
        setPolkadotAddress(remoteConfig.get('runtime.services.dxns.address') ?? await client.halo.getDevicePreference('DXNSAddress'));
        setDXNSAccount(remoteConfig.get('runtime.services.dxns.account') ?? await client.halo.getGlobalPreference('DXNSAccount'));
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

  const handleCreateProfile: RegistrationDialogProps['onComplete'] = async (seedphrase, username) => {
    setInProgress(true);
    try {
      await client.halo.createProfile({ seedphrase, username });
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
      {polkadotAddress &&
        <p>Your Polkadot Address: {polkadotAddress}</p>
      }
      {DXNSAccount &&
        <p>Your DXNS Account: {DXNSAccount}</p>
      }
      <p>Your profile public key: {profile.publicKey.toString()}</p>
      <Button disabled={inProgress} onClick={handleReset} variant='outlined'>Reset</Button>
      <Button disabled={inProgress} onClick={() => setJoinHaloDialog(true)} variant='outlined'>Join HALO</Button>
      <Button disabled={inProgress} onClick={handleCreateParty} variant='outlined'>Create party</Button>
      <p>You have {parties.length} parties.</p>
    </div>
  );
};
