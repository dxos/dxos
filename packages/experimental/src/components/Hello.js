//
// Copyright 2020 DxOS.org
//

import React from 'react';
import { makeStyles } from '@material-ui/core/styles';

const useStyles = makeStyles(() => ({
  root: {
    display: 'flex',
    flex: 1,
    justifyContent: 'center'
  },

  container: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center'
  },

  text: {
    fontFamily: 'monospace',
    fontSize: 64
  }
}));

//
// Hello
//
const Hello = () => {
  const classes = useStyles();

  return (
    <div className={classes.root}>
      <div className={classes.container}>
        <span className={classes.text}>Hello</span>
      </div>
    </div>
  );
};

export default Hello;
