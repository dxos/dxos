//
// Copyright 2021 DXOS.org
//

import React from 'react';

import { styled } from '@mui/material';

/**
 * Fullscreen no bounce.
 */
const FullScreenDiv = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  position: 'fixed',
  left: 0,
  right: 0,
  top: 0,
  bottom: 0
});

// TODO(wittjosiah): Props and cleanup.
export const FullScreen: React.FunctionComponent<any> = FullScreenDiv;
