//
// Copyright 2020 DXOS.org
//

import React, { useState } from 'react';

import AppBar from '@material-ui/core/AppBar';
import IconButton from '@material-ui/core/IconButton';
import Toolbar from '@material-ui/core/Toolbar';
import { makeStyles } from '@material-ui/core/styles';
import MenuIcon from '@material-ui/icons/Menu';

import { FullScreen, RightDrawer } from '../src';

const useStyles = makeStyles({
  root: {},

  drawer: {
    padding: 16
  }
});

const LeftLayoutStory = () => {
  const classes = useStyles();

  const [open, setOpen] = useState(true);

  const Main = () => {
    return (
      <div className={classes.root}>
        <AppBar position='static' elevation={0}>
          <Toolbar variant='dense'>
            <IconButton
              color='inherit'
              aria-label='open drawer'
              edge='start'
              onClick={() => setOpen(!open)}
            >
              <MenuIcon />
            </IconButton>
          </Toolbar>
        </AppBar>
      </div>
    );
  };

  const Content = () => {
    return (
      <div className={classes.drawer}>Right</div>
    );
  };

  return (
    <FullScreen>
      <RightDrawer open={open} component={<Content />}>
        <Main />
      </RightDrawer>
    </FullScreen>
  );
};

export default LeftLayoutStory;
