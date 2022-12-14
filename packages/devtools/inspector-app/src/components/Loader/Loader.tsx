//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { Box, CircularProgress, Fade, Typography } from '@mui/material';

export interface LoaderProps {
  loading?: boolean
  label?: string
}

export const Loader = ({ loading, label }: LoaderProps) => (
  <Box sx={{
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  }}>
    <Fade
      in={loading}
      style={{ transitionDelay: loading ? '800ms' : '0ms' }}
      unmountOnExit
    >
      <Box sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {label && <Typography variant='h6'>{label}</Typography>}
        <CircularProgress />
      </Box>
    </Fade>
  </Box>
);
