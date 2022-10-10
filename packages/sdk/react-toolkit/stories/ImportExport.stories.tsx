//
// Copyright 2020 DXOS.org
//

import React, { useState } from 'react';

import { Box } from '@mui/material';

import { ImportDialog, ExportDialog } from '../src/index.js';
import { Container } from './helpers/index.js';

export default {
  title: 'react-toolkit/ImportExport'
};

export const Export = () => {
  const [open, setOpen] = useState(true);

  const encrypter = async (passphrase: string) => 'dxos';

  return (
    <Container>
      <ExportDialog open={open} onClose={() => setOpen(false)} filename={'test.txt'} encrypter={encrypter} />
    </Container>
  );
};

export const Import = () => {
  const [open, setOpen] = useState(true);
  const [value, setValue] = useState<string>();

  const handleClose = (text?: string) => {
    setValue(text);
    setOpen(false);
  };

  const decrypter = async (text: string, passphrase: string) => text;

  return (
    <Container>
      <ImportDialog open={open} onClose={handleClose} decrypter={decrypter} />
      <Box>{value}</Box>
    </Container>
  );
};
