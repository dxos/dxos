//
// Copyright 2021 DXOS.org
//

import { styled } from '@mui/system'; // TODO(burdon): ???

/**
 * Fullscreen no bounce.
 */
export const FullScreen = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  position: 'fixed',
  left: 0,
  right: 0,
  top: 0,
  bottom: 0
});
