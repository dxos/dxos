//
// Copyright 2020 DXOS.org
//

import React, { useCallback, useState } from 'react';

import AppBar from '@material-ui/core/AppBar';
import IconButton from '@material-ui/core/IconButton';
import Toolbar from '@material-ui/core/Toolbar';
import { makeStyles } from '@material-ui/core/styles';
import DebugIcon from '@material-ui/icons/BugReport';
import MenuIcon from '@material-ui/icons/Menu';

import { FullScreen, LeftDrawer, RightDrawer } from '../src';

const useStyles = makeStyles(theme => ({
  drawer: {
    padding: theme.spacing(2)
  },

  statusBar: {
    backgroundColor: '#EEE'
  }
}));

const LayoutStory = () => {
  const classes = useStyles();
  const [left, setLeft] = useState(true);
  const [right, setRight] = useState(true);

  const handleToggleLeft = useCallback(() => setLeft(!left));
  const handleToggleRight = useCallback(() => setRight(!right));

  return (
    <FullScreen>
      <RightDrawer open={right} component={<div className={classes.drawer}>Right</div>}>
        <LeftDrawer open={left} component={<div className={classes.drawer}>Left</div>}>
          <AppBar position='static' elevation={0}>
            <Toolbar variant='dense'>
              <IconButton
                color='inherit'
                aria-label='open drawer'
                edge='start'
                onClick={handleToggleLeft}
              >
                <MenuIcon />
              </IconButton>
            </Toolbar>
          </AppBar>
        </LeftDrawer>
        <Toolbar variant='dense' className={classes.statusBar}>
          <IconButton
            color='inherit'
            aria-label='right drawer'
            edge='start'
            onClick={handleToggleRight}
          >
            <DebugIcon />
          </IconButton>
        </Toolbar>
      </RightDrawer>
    </FullScreen>
  );
};

export default LayoutStory;
