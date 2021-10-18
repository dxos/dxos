//
// Copyright 2021 DXOS.org
//

import { Box } from '@mui/material';
import React, { useState } from 'react';

import { CustomTextField } from '../src';
import { Container } from './helpers';

export default {
  title: 'react-components/CustomTextField',
  component: CustomTextField
};

export const Primary = () => {
  const [text, setText] = useState<string>('CustomTextField');

  return (
    <Container>
      <Box sx={{ padding: 1 }}>
        <CustomTextField
          value={text}
          onUpdate={setText}
          placeholder='Enter title'
        />
        <CustomTextField
          placeholder='Enter title'
        />
      </Box>
    </Container>
  );
};
