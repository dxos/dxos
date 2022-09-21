//
// Copyright 2022 DXOS.org
//

import React, { useState } from 'react';

import { Box, Button, TextField } from '@mui/material';

import { useClient, useProfile } from '@dxos/react-client';
import { QRCode } from '@dxos/react-components';

export const IdentityPage = () => {
  const client = useClient();
  const profile = useProfile(true);
  const [username, setUsername] = useState(profile?.username ?? '');

  return (
    <Box sx={{ display: 'flex', flexGrow: 1 }}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          flexGrow: 1,
          padding: 2,
          maxWidth: '25rem',
          margin: '0 auto'
        }}
      >
        {/* TODO(wittjosiah): Update with device invite. */}
        <QRCode value='https://halo.dxos.org' />
        <TextField
          label='Username'
          fullWidth
          value={username}
          onChange={event => setUsername(event.target.value)}
          sx={{ marginTop: 4 }}
        />
        {/* TODO(wittjosiah): Allow updating username. */}
        {/* {username !== profile?.username && (
          <Button
            variant='outlined'
            fullWidth
            onClick={() => client.halo.setGlobalPreference('username', username)}
          >Update</Button>
        )} */}
        <Box sx={{ flexGrow: 1 }} />
        <Button
          variant='outlined'
          color='error'
          fullWidth
          onClick={async () => {
            await client.reset();
            window.location.reload();
          }}
        >
          Reset Device
        </Button>
      </Box>
    </Box>
  );
};
