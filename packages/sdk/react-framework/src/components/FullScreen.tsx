//
// Copyright 2020 DXOS.org
//

import { styled } from '@mui/material';
import React from 'react';

const Root = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  position: 'fixed',
  left: 0,
  right: 0,
  top: 0,
  bottom: 0
});

/**
 * Fullscreen container.
 */
export const FullScreen = ({ children }: { children: React.ReactNode }) => {
  return (
    <Root>
      {children}
    </Root>
  );
};
