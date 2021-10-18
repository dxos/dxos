//
// Copyright 2021 DXOS.org
//

import { useTheme, Box, Divider, TextField } from '@mui/material';
import React from 'react';

import { CopyText } from '../src';
import { Container } from './helpers';

export default {
  title: 'react-components/CopyText',
  component: CopyText
};

export const Primary = () => {
  const theme = useTheme();
  const value = 'ef235aacf90d9f4aadd8c92e4b2562e1d9eb97f0df9ba3b508258739cb013db2';

  return (
    <Container>
      <Box sx={{ padding: 1 }}>
        <Box sx={{ width: 240 }}>
          <CopyText value='Text' />
          <CopyText value={value} sx={{ fontFamily: 'monospace' }} color={theme.palette.primary.main} />
          <CopyText value={value} sx={{ fontFamily: 'monospace' }} length={8} />
        </Box>
        <Divider />
        <TextField
          sx={{ marginTop: 2 }}
          spellCheck={false}
          fullWidth
        />
      </Box>
    </Container>
  );
};
