//
// Copyright 2020 DXOS.org
//

import { Box } from '@mui/material';
import React from 'react';

import { Passcode } from '../src';
import { Container } from './helpers';

export default {
  title: 'react-components/Passcode',
  component: Passcode
};

export const Primary = () => {
  return (
    <Container>
      <Box
        sx={{ width: '100%' }}
      >
        <Passcode
          editable={true}
          length={6}
          attempt={1}
          onSubmit={() => {}}
        />
      </Box>
    </Container>
  );
};
