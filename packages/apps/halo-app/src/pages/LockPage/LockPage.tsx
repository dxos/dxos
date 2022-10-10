//
// Copyright 2021 DXOS.org
//

import React, { useCallback, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { Box, Button, FormControlLabel, Switch, Typography } from '@mui/material';

import { Client, Party } from '@dxos/client';
import { useClient, useProfile } from '@dxos/react-client';
import { FullScreen, QRCode } from '@dxos/react-components';
import { JoinHaloDialog } from '@dxos/react-toolkit';
import { humanize } from '@dxos/util';

import { ExistingIdentityDialog } from './ExistingIdentityDialog.js';
import { NewIdentityDialog } from './NewIdentityDialog.js';

export interface RegistrationPageProps {
  onRegister?: (client: Client) => Promise<Party>
}

/**
 * Allows user to create an identity, join an existing identity or unlock their current identity.
 */
export const LockPage = () => {
  const client = useClient();
  const profile = useProfile(true);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') ?? '/spaces';

  const [newIdentityOpen, setNewIdentityOpen] = useState(false);
  const [existingIdentityOpen, setExistingIdentityOpen] = useState(false);
  const [deviceInviteOpen, setDeviceInviteOpen] = useState(false);

  const handleUnlock = useCallback(() => {
    navigate('/spaces');
  }, []);

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
        <QRCode value='https://halo.dxos.org' />

        {!profile && (
          <>
            <Typography>HALO</Typography>
            <Typography>There are no identities on this device yet</Typography>
            <Button onClick={() => setNewIdentityOpen(true)}>new identity</Button>
            <Button onClick={() => setExistingIdentityOpen(true)}>existing identity</Button>
          </>
        )}

        {profile && (
          <>
            <Typography>
              Using HALO as
              {' '}
              <Typography
                component='span'
                sx={{ fontWeight: 700 }}
              >
                {profile.username ?? humanize(profile.publicKey)}
              </Typography>
            </Typography>
            <FormControlLabel
              control={<Switch />}
              label='🔒️'
              onChange={handleUnlock}
            />
          </>
        )}

        <Button onClick={() => window.open('https://github.com/dxos/dxos', '_blank')}>help</Button>
      </Box>

      <NewIdentityDialog
        open={newIdentityOpen}
        onClose={() => setNewIdentityOpen(false)}
        onComplete={async (_: string, username: string) => {
          // Create profile.
          // TODO(burdon): Error handling.
          await client.halo.createProfile({ username });
          navigate(redirect);
        }}
      />

      <ExistingIdentityDialog
        open={existingIdentityOpen}
        onClose={() => setExistingIdentityOpen(false)}
        onRecover={async seedphrase => {
          await client.halo.createProfile({ seedphrase });
          navigate(redirect);
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
          navigate(redirect);
        }}
      />
    </FullScreen>
  );
};
