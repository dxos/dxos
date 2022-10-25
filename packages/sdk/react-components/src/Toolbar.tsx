//
// Copyright 2021 DXOS.org
//

import { FunctionComponent } from 'react';

import {
  Toolbar as MuiToolbar,
  ToolbarProps as MuiToolbarProps,
  styled
} from '@mui/material';

/**
 * Toolbar that uses the primary color as background when using dark mode.
 */
const StyledToolbar = styled(MuiToolbar)<MuiToolbarProps>(({ theme }) => ({
  backgroundColor:
    theme.palette.mode === 'dark' ? theme.palette.primary.main : undefined,
  color:
    theme.palette.mode === 'dark'
      ? theme.palette.background.default
      : undefined,
  '*': {
    color:
      theme.palette.mode === 'dark'
        ? theme.palette.background.default
        : undefined
  }
}));

export const Toolbar: FunctionComponent<MuiToolbarProps> = StyledToolbar;
