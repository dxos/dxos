//
// Copyright 2021 DXOS.org
//

import React from 'react';
import { browser } from 'webextension-polyfill-ts';

import { AppBar, IconButton, makeStyles, Toolbar, Tooltip, Typography } from '@material-ui/core';
import { Fullscreen as FullscreenIcon } from '@mui/icons-material';
import { LinearProgress } from '@mui/material';

import { ClientInitializer } from '@dxos/react-client';
import { ErrorView } from '@dxos/react-framework';

import { WithSnackbarContext } from '../contexts';
import { useExtensionPort } from '../hooks';
import { inFullScreenMode } from '../utils';
import Main from './Main';

const useStyles = makeStyles({
  logo: {
    maxWidth: 20,
    margin: 5
  },
  title: {
    flexGrow: 1
  }
});

const Root = () => {
  const classes = useStyles();
  const rpcPort = useExtensionPort();

  const onExpandToFullscreen = async () => {
    if (inFullScreenMode()) {
      return;
    }
    const fullScreenUrl = location.href.replace('popup/popup.html', 'popup/fullscreen.html');
    await browser.tabs.create({ active: true, url: fullScreenUrl });
  };

  return (
    <ClientInitializer
      config={{ system: { remote: true } }}
      clientOpts={{ rpcPort }}
      loaderComponent={() => <LinearProgress />}
      errorComponent={ErrorView}
    >
      <WithSnackbarContext>
        <AppBar position='static' color='default'>
          <Toolbar>
            <img src='../dxos.png' alt='logo' className={classes.logo} />
            <Typography variant='h6' className={classes.title}> Welcome to DXOS! </Typography>
            <Tooltip title='Expand to fullscreen' placement='left' arrow>
              <IconButton onClick={onExpandToFullscreen}>
                <FullscreenIcon />
              </IconButton>
            </Tooltip>
          </Toolbar>
        </AppBar>
        <Main />
      </WithSnackbarContext>
    </ClientInitializer>
  );
};

export default Root;
