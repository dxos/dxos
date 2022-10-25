//
// Copyright 2020 DXOS.org
//

import React, { ReactNode } from 'react';

import { styled } from '@mui/material';

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

export const Container = ({ children }: { children: ReactNode }) => (
  <FullScreen>
    <ThemeProvider>{children}</ThemeProvider>
  </FullScreen>
);
