//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { Error as ErrorIcon } from '@mui/icons-material';
import { Box, IconButton, colors } from '@mui/material';

export interface ErrorIndicatorProps {
  errors: Error[];
  onReset?: () => void;
}

export const ErrorIndicator = ({ errors, onReset }: ErrorIndicatorProps) => {
  if (!errors.length) {
    return null;
  }

  return (
    <Box
      sx={{
        position: 'absolute',
        right: 0,
        bottom: 0
      }}
    >
      <IconButton
        size='small'
        title={String(errors[0])}
        onClick={onReset}
        sx={{
          color: colors.deepOrange[500]
        }}
      >
        <ErrorIcon />
      </IconButton>
    </Box>
  );
};
