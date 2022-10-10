//
// Copyright 2022 DXOS.org
//

import React, { useState } from 'react';

import { Add as AddIcon } from '@mui/icons-material';
import { Box, Fab } from '@mui/material';

import { PublicKey } from '@dxos/keys';
import { HaloSharingDialog } from '@dxos/react-toolkit';

import { DeviceList } from '../../components/index.js';

export const DevicesPage = () => {
  const [devices] = useState([{ publicKey: PublicKey.random(), displayName: 'This Device' }]);
  const [showShare, setShowShare] = useState(false);

  return (
    <Box sx={{ overflow: 'auto' }}>
      <Box
        sx={{
          maxWidth: '25rem',
          margin: '0 auto',
          padding: 2
        }}
      >
        <DeviceList
          devices={devices}
        />
      </Box>
      <Fab
        onClick={() => setShowShare(true)}
        sx={{
          position: 'absolute',
          bottom: 16,
          right: 16
        }}
      >
        <AddIcon />
      </Fab>

      <HaloSharingDialog
        open={showShare}
        onClose={() => setShowShare(false)}
      />
    </Box>
  );
};
