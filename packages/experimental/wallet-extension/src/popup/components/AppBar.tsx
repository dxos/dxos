//
// Copyright 2021 DXOS.org
//

import React from 'react';
import browser from 'webextension-polyfill';

import { Fullscreen as FullscreenIcon } from '@mui/icons-material';
import { AppBar as MuiAppBar, Box, IconButton, Toolbar, Tooltip, Typography } from '@mui/material';

import { inFullScreenMode } from '../utils/index.js';

export const AppBar = () => {
  const onExpandToFullscreen = async () => {
    if (inFullScreenMode()) {
      return;
    }
    const fullScreenUrl = location.href.replace('popup/popup.html', 'popup/fullscreen.html');
    await browser.tabs.create({ active: true, url: fullScreenUrl });
  };

  return (
    <MuiAppBar position='static' color='default'>
      <Toolbar>
        <Box sx={{
          maxWidth: 20,
          margin: 5
        }}>
          <img src='../dxos.png' alt='logo' />
        </Box>
        <Typography variant='h6' sx={{ flexGrow: 1 }}> Welcome to DXOS! </Typography>
        {inFullScreenMode() || (
          <Tooltip title='Expand to fullscreen' placement='left' arrow>
            <IconButton onClick={onExpandToFullscreen}>
              <FullscreenIcon />
            </IconButton>
          </Tooltip>
        )}
      </Toolbar>
    </MuiAppBar>
  );
};
