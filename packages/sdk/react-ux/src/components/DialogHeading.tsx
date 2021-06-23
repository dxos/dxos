//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { DialogTitle, SvgIconTypeMap, Toolbar, Typography } from '@material-ui/core';
import { OverridableComponent } from '@material-ui/core/OverridableComponent';
import { makeStyles } from '@material-ui/core/styles';

const useStyles = makeStyles((theme) => ({
  title: {
    marginLeft: theme.spacing(2)
  }
}));

const DialogHeading = ({
  title,
  icon: Icon
}: {
  title: string;
  icon: OverridableComponent<SvgIconTypeMap<unknown, 'svg'>>;
}) => {
  const classes = useStyles();
  return (
    <DialogTitle>
      <Toolbar variant='dense' disableGutters>
        <Icon />
        <Typography variant='h5' className={classes.title}>
          {title}
        </Typography>
      </Toolbar>
    </DialogTitle>
  );
};

export default DialogHeading;
