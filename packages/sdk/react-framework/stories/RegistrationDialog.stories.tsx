//
// Copyright 2020 DXOS.org
//

import Box from '@mui/material/Box';
import React, { useState } from 'react';

import { sleep } from '@dxos/async';

import { RegistrationDialog } from '../src';

export default {
  title: 'react-framework/RegistrationDialog',
  component: RegistrationDialog
};

export const Primary = () => {
  const [open, setOpen] = useState(true);

  return (
    <Box m={2}>
      <RegistrationDialog
        open={open}
        onComplete={() => sleep(1000).then(() => setOpen(false)) }
        onRestore={() => sleep(1000).then(() => {
          throw new Error('Corrupt seed phrase.');
        })}
      />
    </Box>
  );
};
