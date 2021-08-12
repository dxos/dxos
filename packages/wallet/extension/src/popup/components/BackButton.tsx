//
// Copyright 2021 DXOS.org
//

import React from 'react';
import { useHistory } from 'react-router-dom';

import { IconButton, Grid } from '@material-ui/core';
import ArrowBackIosIcon from '@material-ui/icons/ArrowBackIos';

const BackButton = () => {
  const history = useHistory();

  const onReturn = () => {
    history.goBack();
  };

  return (
    <Grid container justify='flex-start'>
      <IconButton size='small' style={{ borderRadius: 5 }} onClick={onReturn}>
        <ArrowBackIosIcon /> Back
      </IconButton>
    </Grid>
  );
};

export default BackButton;
