//
// Copyright 2021 DXOS.org
//

import React, { useState } from 'react';

import { Box } from '@mui/material';

import { CustomTextField } from '../src';
import { Container } from './helpers';

export default {
  title: 'react-components/CustomTextField',
  component: CustomTextField
};

export const Primary = () => {
  const [text, setText] = useState<string>();

  return (
    <Container>
      <Box sx={{}}>
        <CustomTextField
          value={text}
          onChange={setText}
        />
      </Box>
    </Container>
  );
};
