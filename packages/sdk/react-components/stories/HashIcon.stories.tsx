//
// Copyright 2021 DXOS.org
//

import React from 'react';

import { Box, IconButton } from '@mui/material';

import { PublicKey } from '@dxos/keys';

import { CopyText, HashIcon } from '../src/index.js';

export default {
  title: 'react-components/HashIcon',
  component: HashIcon
};

export const Primary = () => (
  <Box sx={{
    display: 'flex',
    flexDirection: 'column',
    padding: 1
  }}>
    {Array.from({ length: 16 }).map((_, i) => {
      const value = PublicKey.random().toHex();
      return (
        <Box key={i} sx={{ display: 'flex' }}>
          <IconButton sx={{ marginRight: 1 }} disabled>
            <HashIcon value={value} />
          </IconButton>
          <CopyText value={value} monospace length={16} />
        </Box>
      );
    })}
  </Box>
);
