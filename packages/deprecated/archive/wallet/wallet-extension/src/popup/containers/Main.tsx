//
// Copyright 2020 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { Button } from '@mui/material';

import { Config } from '@dxos/config';
import { useClient, useIdentity, useClientServices } from '@dxos/react-client';
import { JoinHaloDialog, RegistrationDialog, RegistrationDialogProps } from '@dxos/react-toolkit';

export const Main = () => {
  const client = useClient();
  const [spaces, setSpaces] = useState<any[]>([]);
  const profile = useIdentity();
  const [error, setError] = useState<Error | undefined>(undefined);
  const [inProgress, setInProgress] = useState(false);
  const [joinHaloDialog, setJoinHaloDialog] = useState(false);
  const [polkadotAddress, setPolkadotAddress] = useState<string | undefined>();
  const [DXNSAccount, setDXNSAccount] = useState<string | undefined>();
  const services = useClientServices();
  if (!services) {
    return null;
  }

  useEffect(() => {
    setTimeout(async () => {
      try {
        const remoteConfig = new Config(await services.SystemService.getConfig());
        setPolkadotAddress(
          remoteConfig.get('runtime.services.dxns.address') ?? (await client.halo.getDevicePreference('DXNSAddress'))
        );
        setDXNSAccount(
          remoteConfig.get('runtime.services.dxns.account') ?? (await client.halo.getGlobalPreference('DXNSAccount'))
        );
      } catch (err: any) {
        setError(err);
      }
    });
  }, []);

  useEffect(() => {
    const spaceStream = services.SpaceService.subscribeSpaces();
    spaceStream.subscribe(
      (response: any) => setSpaces(response.spaces ?? []),
      (error: Error) => setError(error)
    );
    return () => spaceStream.close();
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

  const handleCreateSpace = async () => {
    setInProgress(true);
    try {
      await services.SpaceService.createSpace();
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
    return <JoinHaloDialog open modal={false} onClose={() => setJoinHaloDialog(false)} />;
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
      <p>Hello, {profile.displayName ?? profile.identityKey.toString()}</p>
      {polkadotAddress && <p>Your Polkadot Address: {polkadotAddress}</p>}
      {DXNSAccount && <p>Your DXNS Account: {DXNSAccount}</p>}
      <p>Your profile public key: {profile.identityKey.toString()}</p>
      <Button disabled={inProgress} onClick={handleReset} variant='outlined'>
        Reset
      </Button>
      <Button disabled={inProgress} onClick={() => setJoinHaloDialog(true)} variant='outlined'>
        Join HALO
      </Button>
      <Button disabled={inProgress} onClick={handleCreateSpace} variant='outlined'>
        Create space
      </Button>
      <p>You have {spaces.length} spaces.</p>
    </div>
  );
};
