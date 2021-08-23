//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { makeStyles } from '@material-ui/core/styles';

const useStyles = makeStyles(() => ({
  root: {
    display: 'flex',
    flexDirection: 'column',
    position: 'fixed',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0
  }
}));

/**
 * Fullscreen container.
 */
const FullScreen = ({ children }: { children: React.ReactNode }) => {
  const classes = useStyles();

  return (
    <div className={classes.root}>
      {children}
    </div>
  );
};

export default FullScreen;
