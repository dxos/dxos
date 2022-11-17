//
// Copyright 2021 DXOS.org
//

import React, { useState } from 'react';

import { Box, Divider } from '@mui/material';

import { Searchbar } from '../src';
import { Container } from './helpers';

export default {
  title: 'react-components/SearchBar',
  component: Searchbar
};

export const Primary = () => {
  const [value, setValue] = useState<string | undefined>();

  return (
    <Container>
      <Box sx={{ padding: 1 }}>
        <Searchbar placeholder='Search records' onSearch={setValue} delay={500} />
        <Divider />
        <Box>{value}</Box>
      </Box>
    </Container>
  );
};
