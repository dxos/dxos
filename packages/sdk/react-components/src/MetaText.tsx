//
// Copyright 2020 DXOS.org
//

import { Box, Typography } from '@mui/material';
import React from 'react';

import { truncateString } from '@dxos/debug';

import { CopyToClipboard } from './CopyToClipboard';

export const MetaText = ({ value, length = 8 } : { value: string, length?: number }) => {
  return (
    <Box sx={{
      display: 'flex',
      alignItems: 'center'
    }}>
      <Typography>
        {truncateString(value, length)}
      </Typography>
      <CopyToClipboard text={value} />
    </Box>
  );
};
