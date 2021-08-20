//
// Copyright 2020 DXOS.org
//

import React from 'react';
import { addDecorator } from '@storybook/react';

import CssBaseline from '@material-ui/core/CssBaseline';
import { MuiThemeProvider, createMuiTheme } from '@material-ui/core/styles';

const theme = createMuiTheme();

// Remove padding.
export const parameters = { layout: 'fullscreen' }

addDecorator(storyFn => (
  <MuiThemeProvider theme={theme}>
    <CssBaseline />
    {storyFn()}
  </MuiThemeProvider>
));
