//
// Copyright 2022 DXOS.org
//

import React, { useState } from 'react';

import { Box, Button } from '@mui/material';

import { Loader } from './Loader.js';

export default {
  title: 'Loader'
};

export const Primary = () => {
  const [loading, setLoading] = useState(true);

  return (
    <>
      <Button onClick={() => setLoading(!loading)}>Toggle</Button>
      <Box display='flex'>
        <Loader loading={loading} label='Loading...' />
      </Box>
    </>
  );
};
