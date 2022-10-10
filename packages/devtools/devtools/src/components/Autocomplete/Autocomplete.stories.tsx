//
// Copyright 2020 DXOS.org
//

import faker from 'faker';
import React from 'react';

import { Box } from '@mui/material';

import { FullScreen } from '@dxos/react-components';

import { Autocomplete } from './Autocomplete.js';

export default {
  title: 'Autocomplete'
};

export const Primary = () => {
  const options = Array.from({ length: 10 }).map(() => faker.lorem.word());

  return (
    <FullScreen>
      <Box sx={{ padding: 2 }}>
        <Autocomplete
          label='Test'
          options={options}
          onUpdate={value => console.log(value)}
        />
      </Box>
    </FullScreen>
  );
};
