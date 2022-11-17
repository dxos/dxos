//
// Copyright 2020 DXOS.org
//

import React, { useState } from 'react';

import { Box, Button } from '@mui/material';

import { sleep } from '@dxos/async';

import { RegistrationDialog } from '../src';

export default {
  title: 'react-toolkit/RegistrationDialog',
  component: RegistrationDialog
};

export const Primary = () => {
  const [open, setOpen] = useState(true);

  return (
    <Box m={2}>
      <Button onClick={() => setOpen(true)}>Open</Button>
      <RegistrationDialog
        open={open}
        onComplete={() => sleep(1000).then(() => setOpen(false))}
        onRestore={() =>
          sleep(1000).then(() => {
            throw new Error('Corrupt seed phrase.');
          })
        }
      />
    </Box>
  );
};
