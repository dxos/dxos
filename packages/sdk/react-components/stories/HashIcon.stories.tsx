//
// Copyright 2021 DXOS.org
//

import React from 'react';

import { Box } from '@mui/material';

import { PublicKey } from '@dxos/crypto';

import { CopyText, HashIcon } from '../src';

export default {
  title: 'react-components/HashIcon',
  component: HashIcon
};

export const Primary = () => {
  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      padding: 1
    }}>
      {Array.from({ length: 16 }).map((_, i) => {
        const value = PublicKey.random().toHex();
        return (
          <Box key={i} sx={{ display: 'flex' }}>
            <HashIcon value={value} size='large' sx={{ marginRight: 1 }} />
            <CopyText value={value} monospace length={16} sx={{ marginLeft: 1 }} />
          </Box>
        );
      })}
    </Box>
  );
};
