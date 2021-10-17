//
// Copyright 2021 DXOS.org
//

import { Box, Divider, TextField } from '@mui/material';
import React from 'react';

import { MetaText } from '../src';
import { Container } from './helpers';

export default {
  title: 'react-components/MetaText',
  component: MetaText
};

export const Primary = () => {
  const value = 'ef235aacf90d9f4aadd8c92e4b2562e1d9eb97f0df9ba3b508258739cb013db2';

  return (
    <Container>
      <Box sx={{ padding: 1, width: 200 }}>
        <MetaText value={value} />
        <Divider />
        <TextField />
      </Box>
    </Container>
  );
};
