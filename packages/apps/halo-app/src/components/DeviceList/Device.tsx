//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { Box, Card, CardContent, Typography } from '@mui/material';

import { PublicKey } from '@dxos/keys';
import { HashIcon } from '@dxos/react-components';

export interface DeviceProps {
  device: {
    publicKey: PublicKey
    displayName?: string
  }
}

export const Device = ({ device }: DeviceProps) => {
  return (
    <Card variant='outlined'>
      <CardContent>
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: 1
        }}>
          <HashIcon value={device.publicKey.toHex()} />
          <Typography variant='h5' sx={{ marginLeft: 1 }}>{device.displayName}</Typography>
        </Box>
        <Typography sx={{ fontFamily: 'monospace', overflowWrap: 'break-word' }}>
          {device.publicKey.toHex()}
        </Typography>
      </CardContent>
    </Card>
  );
};
