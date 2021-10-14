//
// Copyright 2020 DXOS.org
//

import { Box, Typography } from '@mui/material';
import React from 'react';

import { truncateString } from '@dxos/debug';
import { CopyToClipboard } from '@dxos/react-framework';

export const Key = ({ text } : { text: string }) => {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center' }} >
      <Typography>
        {truncateString(text, 8)}
      </Typography>
      <CopyToClipboard text={text} />
    </Box>
  );
};
