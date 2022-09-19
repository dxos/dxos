//
// Copyright 2021 DXOS.org
//

import React, { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';

import { Box, Button, Typography } from '@mui/material';

import { Client, Party } from '@dxos/client';
import { PublicKey } from '@dxos/protocols';
import { useClient, useProfile } from '@dxos/react-client';
import { FullScreen, QRCode } from '@dxos/react-components';
import { JoinHaloDialog } from '@dxos/react-toolkit';

import { LOCK_KEY } from '../../constants';
import { ExistingIdentityDialog } from './ExistingIdentityDialog';
import { NewIdentityDialog } from './NewIdentityDialog';

const createPath = (partyKey?: PublicKey, itemId?: string) => {
  const parts = [];
  if (partyKey) {
    parts.push(partyKey.toHex());
    if (itemId) {
      parts.push(itemId);
    }
  }

  return '/' + parts.join('/');
};

export interface RegistrationPageProps {
  onRegister?: (client: Client) => Promise<Party>
}

/**
 * Allows user to create an identity or join an existing identity.
 */
export const RegistrationPage = ({ onRegister }: RegistrationPageProps) => {
  const client = useClient();
  const profile = useProfile(true);

  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const redirect = pathname.split('/').slice(2).join('/');

  const [newIdentityOpen, setNewIdentityOpen] = useState(false);
  const [existingIdentityOpen, setExistingIdentityOpen] = useState(false);
  const [deviceInviteOpen, setDeviceInviteOpen] = useState(false);

  // TODO(wittjosiah): Implement locking in HALO identity.
  if (profile && localStorage.getItem(LOCK_KEY) !== 'locked') {
    return (
      <Navigate to='/' />
    );
  }

  return (
    <FullScreen>
      <Box sx={{
        display: 'flex',
        flexGrow: 1,
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-evenly',
        maxHeight: '700px'
      }}>
        {/* TODO(wittjosiah): Update with device invite. */}
        <QRCode value='https://dxos.org' />
        <Typography>HALO</Typography>
        <Typography>There are no identities on this device yet</Typography>
        <Button onClick={() => setNewIdentityOpen(true)}>new identity</Button>
        <Button onClick={() => setExistingIdentityOpen(true)}>existing identity</Button>
        <Button onClick={() => window.open('https://github.com/dxos/dxos', '_blank')}>help</Button>
      </Box>

      <NewIdentityDialog
        open={newIdentityOpen}
        onClose={() => setNewIdentityOpen(false)}
        onComplete={async (_: string, username: string) => {
          // Create profile.
          // TODO(burdon): Error handling.
          await client.halo.createProfile({ username });
          const party = await onRegister?.(client);

          const path = redirect ? `/${redirect}${search}` : createPath(party?.key);
          navigate(path);
        }}
      />

      <ExistingIdentityDialog
        open={existingIdentityOpen}
        onClose={() => setExistingIdentityOpen(false)}
        onRecover={async seedphrase => {
          await client.halo.createProfile({ seedphrase });
          navigate(`/${redirect}${search}`);
        }}
        onInvite={() => {
          setExistingIdentityOpen(false);
          setDeviceInviteOpen(true);
        }}
      />

      <JoinHaloDialog
        open={deviceInviteOpen}
        closeOnSuccess={false}
        onClose={() => setDeviceInviteOpen(false)}
        onJoin={() => {
          navigate(`/${redirect}${search}`);
        }}
      />
    </FullScreen>
  );
};
