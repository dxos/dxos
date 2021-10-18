//
// Copyright 2021 DXOS.org
//

import { Box, Button, TextField, Toolbar } from '@mui/material';
import React, { useState } from 'react';

import { JsonPanel } from './JsonPanel';

export const RedeemInvitationPanel = (
  {
    status,
    onSubmit,
    onAuthenticate
  }: {
    status: any, // TODO(burdon): Define.
    onSubmit: (invitationCode: string) => void
    onAuthenticate: (pin: string) => void
  }
) => {
  const [invitationCode, setInvitationCode] = useState<string>('');
  const [pin, setPin] = useState<string>('');

  return (
    <Box sx={{ padding: 1 }}>
      <Box>
        <Toolbar>
          <Button
            onClick={() => onSubmit(invitationCode)}
            disabled={!invitationCode}
            variant='outlined'
          >
            Join Party
          </Button>
        </Toolbar>

        <Box sx={{ marginTop: 1 }}>
          <TextField
            multiline
            fullWidth
            value={invitationCode}
            onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => {
              setInvitationCode(event.target.value);
              setPin('');
            }}
            maxRows={3}
          />

          {invitationCode && (
            <Box sx={{ display: 'flex', marginTop: 2 }}>
              <TextField
                disabled={!invitationCode}
                value={pin}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => setPin(event.target.value)}
                size='small'
                label='PIN'
              />
              <Button
                disabled={!pin}
                onClick={() => onAuthenticate(pin)}
              >
                Submit
              </Button>
            </Box>
          )}
        </Box>
      </Box>

      {(Object.keys(status).length > 0) && (
        <Box sx={{ marginTop: 1 }}>
          <JsonPanel value={status} />
        </Box>
      )}
    </Box>
  );
};
