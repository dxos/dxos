//
// Copyright 2020 DXOS.org
//

import Box from '@mui/material/Box';
import React, { useState } from 'react';

import { RegistrationDialog } from '../src';

export default {
  title: 'react-framework/RegistrationDialog',
  component: RegistrationDialog
};

export const Primary = () => {
  const [open, setOpen] = useState(true);

  const handleFinishCreate = (username, seedPhrase) => {
    setTimeout(() => {
      setOpen(false);
    }, 1000);
  };

  return (
    <Box m={2}>
      <RegistrationDialog
        open={open}
        onFinishCreate={handleFinishCreate}
        onFinishRestore={() => console.warn('Not implemented.')}
        keyringDecrypter={() => console.warn('Not implemented.')}
      />
    </Box>
  );
};
