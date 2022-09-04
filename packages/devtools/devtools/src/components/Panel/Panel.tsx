//
// Copyright 2021 DXOS.org
//

import React, { ReactNode } from 'react';

import { Box } from '@mui/material';

export interface PanelProps {
  controls?: ReactNode
  children?: ReactNode
}

export const Panel = ({ children, controls }: PanelProps) => (
  <Box sx={{
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    overflow: 'hidden'
  }}>
    {controls && (
      <Box sx={{
        padding: 1,
        '.MuiFormControl-root': {
          marginBottom: '8px'
        }
      }}>
        {controls}
      </Box>
    )}

    {/* Scrolling content. */}
    <Box sx={{ flex: 1, overflow: 'auto' }}>
      {children}
    </Box>
  </Box>
);
