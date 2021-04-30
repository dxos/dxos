//
// Copyright 2020 DXOS.org
//

import React, { useState, useCallback } from 'react';

import { makeStyles } from '@material-ui/core/styles';
import AppBar from '@material-ui/core/AppBar';
import IconButton from '@material-ui/core/IconButton';
import MenuIcon from '@material-ui/icons/Menu';
import Toolbar from '@material-ui/core/Toolbar';

import { FullScreen, LeftDrawer } from '../src';

const useStyles = makeStyles(() => ({
  drawer: {
    padding: 16
  }
}));

const LeftLayoutStory = () => {
  const classes = useStyles();
  const [open, setOpen] = useState(true);
  const handleToggleOpen = useCallback(() => setOpen(!open), [open]);

  return (
    <FullScreen>
      <LeftDrawer open={open} component={<div className={classes.drawer}>Left</div>}>
        <AppBar position='static' elevation={0}>
          <Toolbar variant='dense'>
            <IconButton
              color='inherit'
              aria-label='open drawer'
              edge='start'
              onClick={handleToggleOpen}
            >
              <MenuIcon />
            </IconButton>
          </Toolbar>
        </AppBar>
      </LeftDrawer>
    </FullScreen>
  );
};

export default LeftLayoutStory;
