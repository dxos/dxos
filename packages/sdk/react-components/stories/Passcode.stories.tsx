//
// Copyright 2020 DXOS.org
//

import React, { useState } from 'react';

import { ContentCopy as CopyIcon } from '@mui/icons-material';
import { Box, IconButton, TextField, Typography } from '@mui/material';

import { Passcode } from '../src';
import { Container } from './helpers';

export default {
  title: 'react-components/Passcode',
  component: Passcode
};

export const Primary = () => {
  const [value, setValue] = useState<string>('0000');
  const [attempt, setAttempt] = useState(1);

  const handleSubmit = (value: string) => {
    setValue(value);
    setTimeout(() => {
      setAttempt(attempt + 1);
    }, 1000);
  };

  return (
    <Container>
      <Box sx={{ padding: 2 }}>
        <TextField disabled value={value} />
      </Box>

      <Box>
        {['small', 'medium', 'large'].map((size) => (
          <Box key={size} sx={{ padding: 2 }}>
            <Passcode shake length={4} attempt={attempt} onSubmit={handleSubmit} size={size as any} />
          </Box>
        ))}
      </Box>

      <Box sx={{ padding: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography>PIN</Typography>
          <Passcode sx={{ marginLeft: 1, marginRight: 1 }} disabled value={value} size='small' />
          <IconButton size='small'>
            <CopyIcon />
          </IconButton>
        </Box>
      </Box>
    </Container>
  );
};
