//
// Copyright 2020 DXOS.org
//

import { Box, styled } from '@mui/material';
import React from 'react';

import { ErrorBoundary } from '../../src';

import { ThemeProvider } from './ThemeProvider';

const FullScreen = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  position: 'fixed',
  left: 0,
  right: 0,
  top: 0,
  bottom: 0,
  backgroundColor: '#EEE'
});

export const Container = ({ children }: { children: React.ReactNode }) => (
  <FullScreen>
    <ThemeProvider>
      <ErrorBoundary>
        {children}
      </ErrorBoundary>
    </ThemeProvider>
  </FullScreen>
);
