//
// Copyright 2021 DXOS.org
//

import { FunctionComponent } from 'react';

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
export const FullScreen: FunctionComponent<any> = FullScreenDiv;
