//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { styled } from '@mui/material';

const Root = styled('div')({
  root: {
    display: 'flex',
    flexDirection: 'column',
    position: 'fixed',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0
  }
});

/**
 * Fullscreen container.
 */
const FullScreen = ({ children }: { children: React.ReactNode }) => {
  return (
    <Root>
      {children}
    </Root>
  );
};

export default FullScreen;
