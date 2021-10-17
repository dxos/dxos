//
// Copyright 2021 DXOS.org
//

import { Box } from '@mui/material';
import React, { useState } from 'react';

import { SearchBar } from '../src';

export default {
  title: 'react-components/SearchBar',
  component: SearchBar
};

export const Primary = () => {
  const [value, setValue] = useState<string | undefined>();

  return (
    <Box
      sx={{
        width: 350,
        padding: 2
      }}
    >
      <SearchBar
        placeholder='Search records'
        onSearch={setValue}
        delay={500}
      />
      <Box>{value}</Box>
    </Box>
  );
};
