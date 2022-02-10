//
// Copyright 2021 DXOS.org
//

import React from 'react';
import browser from 'webextension-polyfill';

import { Fullscreen as FullscreenIcon } from '@mui/icons-material';
import { AppBar as MuiAppBar, IconButton, Toolbar, Tooltip, Typography } from '@mui/material';
import { makeStyles } from '@mui/styles';

import { inFullScreenMode } from '../utils';

const useStyles = makeStyles(theme => ({
  logo: {
    maxWidth: 20,
    margin: 5
  },
  title: {
    flexGrow: 1
  }
}));

export const AppBar = () => {
  const classes = useStyles();

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
        <img src='../dxos.png' alt='logo' className={classes.logo} />
        <Typography variant='h6' className={classes.title}> Welcome to DXOS! </Typography>
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
